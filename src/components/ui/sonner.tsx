import { Toaster as SonnerToaster, type ToasterProps } from 'sonner'

export function Toaster(props: ToasterProps) {
  return <SonnerToaster toastOptions={{ duration: 2500 }} {...props} />
}

