/**
 * @description 通用文件上传组件 — 支持头像裁切（CircleStencil）和封面直传
 * @file app/components/AppUpload.vue
 */
<script setup lang="ts">
import { NButton, NIcon, NModal } from 'naive-ui'
import { CloudUploadOutline, CloseOutline, SyncOutline, ImageOutline, CropOutline } from '@vicons/ionicons5'
import { Cropper, CircleStencil } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'

interface Props {
  modelValue?: string
  collection?: string
  recordId?: string
  field?: string
  accept?: string
  maxSize?: number
  disabled?: boolean
  circle?: boolean
  mode?: 'avatar' | 'cover'
  /** 独立媒体上传：落 uploads 集合、回填绝对 URL，不绑业务记录或用户头像（站点 Logo 等基础图片使用）。 */
  standalone?: boolean
  size?: number
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  collection: 'users',
  recordId: '',
  field: 'avatar',
  accept: 'image/*',
  maxSize: 5,
  disabled: false,
  circle: false,
  mode: 'avatar',
  standalone: false,
  size: 128,
})

const emit = defineEmits<{
  'update:modelValue': [filename: string]
  change: [info: { filename: string; url: string }]
}>()

const {
  inputRef,
  cropperRef,
  pendingFile,
  uploading,
  processing,
  isDragOver,
  cropSrc,
  showCropper,
  effectiveMode,
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
} = useFileUpload(props, emit)

defineExpose({ submit, pendingFile })
</script>

<template>
  <div class="inline-flex shrink-0" :style="{ width: size + 'px', height: size + 'px' }">
    <!-- 预览 -->
    <div
      v-if="previewUrl"
      class="group relative cursor-pointer overflow-hidden border-2 border-border/10 transition-all duration-200 hover:border-primary hover:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)] hover:scale-[1.02]"
      :class="effectiveMode === 'avatar' ? 'rounded-full' : 'rounded-lg'"
      :style="{ width: size + 'px', height: size + 'px' }"
      role="button"
      tabindex="0"
      aria-label="更换图片"
      @click="triggerUpload"
      @keydown.enter="triggerUpload"
    >
      <img :src="previewUrl" class="size-full object-cover block">
      <div class="absolute inset-0 flex items-center justify-center bg-black/55 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 backdrop-blur-sm">
        <n-icon :component="ImageOutline" size="20" />
      </div>
      <n-button
        quaternary
        circle
        size="tiny"
        class="absolute top-1 right-1 z-10"
        style="background:var(--card);"
        :disabled="disabled || uploading"
        title="移除"
        @click.stop="handleRemove"
      >
        <template #icon>
          <n-icon :component="CloseOutline" size="14" />
        </template>
      </n-button>
    </div>

    <!-- 上传中 -->
    <div
      v-else-if="uploading"
      class="flex flex-col items-center justify-center border-2 border-dashed border-border/10 bg-muted/30"
      :class="effectiveMode === 'avatar' ? 'rounded-full' : 'rounded-lg'"
      :style="{ width: size + 'px', height: size + 'px' }"
    >
      <n-icon :component="SyncOutline" size="32" class="text-primary animate-spin" />
      <p class="mt-2 text-sm font-medium text-muted-foreground">上传中...</p>
    </div>

    <!-- 空状态 -->
    <div
      v-else
      class="flex flex-col items-center justify-center border-2 border-dashed border-border/10 bg-muted/30 cursor-pointer transition-all duration-200 hover:border-primary hover:bg-primary/5 hover:scale-[1.02] hover:shadow-[0_0_0_3px_var(--primary)_/_0.1] select-none"
      :class="[
        effectiveMode === 'avatar' ? 'rounded-full' : 'rounded-lg',
        isDragOver ? 'border-primary bg-primary/10 border-solid scale-[1.03] shadow-[0_0_0_3px_var(--primary)_/_0.2]' : ''
      ]"
      :style="{ width: size + 'px', height: size + 'px' }"
      role="button"
      tabindex="0"
      aria-label="上传图片"
      @click="triggerUpload"
      @dragover.prevent="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
      @keydown.enter="triggerUpload"
    >
      <n-icon :component="CloudUploadOutline" size="28" :class="isDragOver ? '!text-primary' : ''" style="color:var(--muted-foreground);transition:color 0.2s;" />
      <span class="mt-1.5 text-xs text-muted-foreground">点击或拖拽上传</span>
    </div>

    <input ref="inputRef" type="file" :accept="accept" class="hidden" @change="handleFileChange">

    <!-- 裁切对话框 -->
    <n-modal v-model:show="showCropper" preset="card" title="裁切头像" style="width:450px;" :mask-closable="!processing" @update:show="val => { if (!val && !processing) handleCropCancel() }">
      <div class="flex flex-col items-center gap-4">
        <div class="cropper-wrapper" style="position:relative;width:400px;max-width:100%;height:320px;overflow:hidden;contain:layout paint;border-radius:8px;background:var(--background);border:1px solid var(--border);">
          <Cropper
            ref="cropperRef"
            :src="cropSrc"
            :stencil-component="CircleStencil"
            :stencil-size="{ width: 260, height: 260 }"
            :auto-zoom="true"
            default-boundaries="fit"
            image-restriction="stencil"
            style="width:100%;height:100%;overflow:hidden;border-radius:8px;"
          />
        </div>
        <p class="text-xs text-muted-foreground">滚轮缩放 · 拖拽移动 · 拖动选区边缘调整大小</p>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button :loading="processing" @click="handleCropCancel">取消</n-button>
          <n-button type="primary" :loading="processing" @click="handleCropConfirm">
            <template #icon>
              <n-icon :component="CropOutline" />
            </template>
            {{ processing ? '处理中...' : '确认裁切' }}
          </n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<style lang="scss" scoped>
.cropper-wrapper {
  :deep(.vue-advanced-cropper) {
    overflow: hidden !important;
    border-radius: inherit;
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
