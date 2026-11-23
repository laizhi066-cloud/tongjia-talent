declare module 'dompurify' {
  interface DOMPurifyI {
    sanitize(dirty: string | Node, config?: Config): string
    addHook(
      hook: 'uponSanitizeElement' | 'uponSanitizeAttribute',
      cb: (node: Element, data: SanitizeElementData) => void
    ): void
    setConfig(cfg: Config): void
    removeHook(entryPoint: string): void
  }

  interface Config {
    ALLOWED_TAGS?: string[]
    ALLOWED_ATTR?: string[]
    ALLOW_DATA_ATTR?: boolean
    ADD_TAGS?: string[]
    ADD_ATTR?: string[]
    FORBID_TAGS?: string[]
    FORBID_ATTR?: string[]
    ALLOW_ARIA_ATTR?: boolean
    ALLOW_UNKNOWN_PROTOCOLS?: boolean
    RETURN_DOM?: boolean
    RETURN_DOM_FRAGMENT?: boolean
    RETURN_DOM_IMPORT?: boolean
    WHOLE_DOCUMENT?: boolean
  }

  interface SanitizeElementData {
    tagName: string
    allowedTags: string[]
  }

  const DOMPurify: DOMPurifyI
  export default DOMPurify
}
