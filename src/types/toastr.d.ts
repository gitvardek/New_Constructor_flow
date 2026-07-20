declare module 'toastr' {
  interface ToastrOptions {
    timeOut?: number
    extendedTimeOut?: number
    closeButton?: boolean
    progressBar?: boolean
    newestOnTop?: boolean
    preventDuplicates?: boolean
    positionClass?: string
    [key: string]: any
  }

  interface Toastr {
    options: ToastrOptions
    success(message?: string, title?: string, options?: ToastrOptions): void
    error(message?: string, title?: string, options?: ToastrOptions): void
    info(message?: string, title?: string, options?: ToastrOptions): void
    warning(message?: string, title?: string, options?: ToastrOptions): void
    clear(): void
    remove(): void
  }

  const toastr: Toastr
  export default toastr
} 