/**
 * @description 文件上传 + 裁切逻辑 composable — 抽离自 AppUpload 组件
 * @file app/composables/useFileUpload.ts
 */
import { useMessage } from 'naive-ui'
import type { Cropper } from 'vue-advanced-cropper'

interface UploadEmitFn {
  (e: 'update:modelValue', filename: string): void
  (e: 'change', info: { filename: string; url: string }): void
}

export function useFileUpload(
  props: {
    modelValue?: string
    collection?: string
    recordId?: string
    field?: string
    accept?: string
    maxSize?: number
    disabled?: boolean
    circle?: boolean
    mode?: 'avatar' | 'cover'
    standalone?: boolean
  },
  emit: UploadEmitFn,
) {
  const message = useMessage()
  const pbUrl = String((useRuntimeConfig().public as { pocketbaseUrl?: string }).pocketbaseUrl ?? '').replace(/\/$/, '')

  const inputRef = ref<HTMLInputElement | null>(null)
  const cropperRef = ref<InstanceType<typeof Cropper> | null>(null)
  const pendingFile = ref<File | null>(null)
  const uploading = ref(false)
  const processing = ref(false)
  const isDragOver = ref(false)
  const localPreviewUrl = ref('')
  const cropSrc = ref('')
  const showCropper = ref(false)

  // 独立上传强制 cover（不走头像圆形裁切）
  const effectiveMode = computed(() => (props.standalone ? 'cover' : props.circle ? 'avatar' : props.mode))

  const serverUrl = computed(() => {
    if (!props.modelValue) return ''
    // 已是完整/半完整文件地址直接用，绝不再拼前缀。
    // 覆盖：http(s)://…/api/files/…（完整地址）、反向代理下的 /<base>/pb/api/files/…、/api/files/…。
    // 只认 http 会漏掉生产的相对前缀 → 列表端点已绝对化的值被再拼一次 → 双前缀 404（仅生产暴露）。
    if (props.modelValue.startsWith('http') || props.modelValue.includes('/api/files/')) return props.modelValue
    if (!props.recordId) return ''
    return `${pbUrl}/api/files/${props.collection}/${props.recordId}/${props.modelValue}`
  })

  // 已移除标记：点「移除」后即使父级用单向 :model-value（不回写），本组件也立即清空预览
  const cleared = ref(false)
  const previewUrl = computed(() => (cleared.value ? '' : (localPreviewUrl.value || serverUrl.value)))

  // 宿主记录/回填值变化（重开弹窗、切换记录）→ 复位移除标记
  watch(() => [props.modelValue, props.recordId], () => { cleared.value = false })

  function triggerUpload() {
    if (props.disabled || uploading.value) return
    inputRef.value?.click()
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault()
    if (!props.disabled && !uploading.value) isDragOver.value = true
  }

  function onDragLeave() {
    isDragOver.value = false
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    isDragOver.value = false
    const file = e.dataTransfer?.files?.[0]
    if (file) processFile(file)
  }

  async function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (file) processFile(file)
    target.value = ''
  }

  function processFile(file: File) {
    cleared.value = false // 选了新图 → 取消移除态
    if (!file.type.startsWith('image/')) {
      message.error('请选择图片文件')
      return
    }
    if (file.size > (props.maxSize ?? 5) * 1024 * 1024) {
      message.error(`文件大小不能超过 ${props.maxSize ?? 5}MB`)
      return
    }
    // 独立媒体：无宿主记录，选完即传到 uploads 集合并回填绝对 URL
    if (props.standalone) {
      doStandaloneUpload(file)
      return
    }
    if (effectiveMode.value === 'avatar') {
      pendingFile.value = file
      showCropper.value = true
      nextTick(() => {
        cropSrc.value = URL.createObjectURL(file)
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      localPreviewUrl.value = (e.target?.result as string) || ''
    }
    reader.readAsDataURL(file)

    if (!props.recordId) {
      pendingFile.value = file
      message.info('保存记录后会自动上传')
      return
    }
    doUpload(file)
  }

  function handleCropConfirm() {
    const { canvas } = cropperRef.value?.getResult() || {}
    if (!canvas) {
      message.error('裁切失败，请重试')
      showCropper.value = false
      return
    }

    processing.value = true
    canvas.toBlob((blob: Blob | null) => {
      if (!blob) {
        message.error('图片处理失败，请重试')
        processing.value = false
        showCropper.value = false
        return
      }

      URL.revokeObjectURL(cropSrc.value)
      cropSrc.value = ''

      localPreviewUrl.value = canvas.toDataURL()

      const croppedFile = new File([blob], pendingFile.value?.name || 'avatar.jpg', {
        type: 'image/jpeg',
      })
      showCropper.value = false
      processing.value = false

      pendingFile.value = croppedFile
    }, 'image/jpeg')
  }

  function handleCropCancel() {
    URL.revokeObjectURL(cropSrc.value)
    cropSrc.value = ''
    showCropper.value = false
    pendingFile.value = null
  }

  // 独立上传：POST /api/upload/form → uploads 集合自动建记录，返回公开绝对 URL；
  // modelValue 直接存绝对 URL，不绑当前用户/业务记录（避免站点 Logo 误写管理员头像）。
  async function doStandaloneUpload(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      localPreviewUrl.value = (e.target?.result as string) || ''
    }
    reader.readAsDataURL(file)

    uploading.value = true
    try {
      const formData = new FormData()
      formData.append('file', file)

      const result = await useUploadApi().uploadFormFile(formData)
      emit('update:modelValue', result.url)
      emit('change', { filename: result.name, url: result.url })
    } catch (e: any) {
      localPreviewUrl.value = ''
      message.error(e?.data?.message || '上传失败')
    } finally {
      uploading.value = false
    }
  }

  async function doUpload(file: File) {
    uploading.value = true
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('collection', props.collection!)
      formData.append('recordId', props.recordId!)
      formData.append('field', props.field!)

      const result = await useUploadApi().uploadFile(formData)
      emit('update:modelValue', result.filename)
      emit('change', result as { filename: string; url: string })
    } catch (e: any) {
      localPreviewUrl.value = ''
      message.error(e?.data?.message || '上传失败')
    } finally {
      uploading.value = false
    }
  }

  async function handleRemove() {
    // 是否为「已落库的图」：有宿主记录 + modelValue 是服务端引用(文件名/URL，非新选的 data: 预览) + 当前无待传文件
    const isServerImage = !props.standalone
      && !!props.recordId
      && !pendingFile.value
      && typeof props.modelValue === 'string'
      && props.modelValue !== ''
      && !props.modelValue.startsWith('data:')

    pendingFile.value = null
    localPreviewUrl.value = ''
    cleared.value = true
    if (cropSrc.value) {
      URL.revokeObjectURL(cropSrc.value)
      cropSrc.value = ''
    }
    showCropper.value = false
    emit('update:modelValue', '')

    // 已落库的图：通知服务端清除该 file 字段，闭环移除（否则刷新后图片还在）
    if (isServerImage) {
      try {
        await useUploadApi().clearFile({ collection: props.collection!, recordId: props.recordId!, field: props.field! })
      } catch {
        message.error('移除失败，请重试')
      }
    }
  }

  async function submit(
    recordId: string,
  ): Promise<{ filename: string; url: string } | null> {
    if (!pendingFile.value) return null
    uploading.value = true
    try {
      const formData = new FormData()
      formData.append('file', pendingFile.value)
      formData.append('collection', props.collection!)
      formData.append('recordId', recordId)
      formData.append('field', props.field!)

      const result = await useUploadApi().uploadFile(formData)
      pendingFile.value = null
      emit('update:modelValue', result.filename)
      emit('change', result as { filename: string; url: string })
      return result as { filename: string; url: string }
    } catch (e: any) {
      message.error(e?.data?.message || '上传失败')
      throw e
    } finally {
      uploading.value = false
    }
  }

  onUnmounted(() => {
    if (cropSrc.value) URL.revokeObjectURL(cropSrc.value)
  })

  return {
    inputRef,
    cropperRef,
    pendingFile,
    uploading,
    processing,
    isDragOver,
    localPreviewUrl,
    cropSrc,
    showCropper,
    effectiveMode,
    serverUrl,
    previewUrl,
    triggerUpload,
    onDragOver,
    onDragLeave,
    onDrop,
    handleFileChange,
    handleCropConfirm,
    handleCropCancel,
    handleRemove,
    submit,
  }
}
