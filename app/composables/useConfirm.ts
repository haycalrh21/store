export interface ConfirmOptions {
    title: string
    description?: string
    confirmText?: string
    cancelText?: string
    variant?: 'danger' | 'warning' | 'primary'
}

interface ConfirmState extends ConfirmOptions {
    isOpen: boolean
}

let resolver: ((value: boolean) => void) | null = null

export const useConfirm = () => {
    const state = useState<ConfirmState>('global-confirm-dialog', () => ({
        isOpen: false,
        title: '',
        description: '',
        confirmText: 'Ya, Lanjutkan',
        cancelText: 'Batal',
        variant: 'danger',
    }))

    const confirmDialog = (options: ConfirmOptions): Promise<boolean> => {
        state.value = {
            isOpen: true,
            title: options.title,
            description: options.description || '',
            confirmText: options.confirmText || 'Ya, Lanjutkan',
            cancelText: options.cancelText || 'Batal',
            variant: options.variant || 'danger',
        }

        return new Promise<boolean>((resolve) => {
            resolver = resolve
        })
    }

    const handleConfirm = () => {
        state.value.isOpen = false
        if (resolver) {
            resolver(true)
            resolver = null
        }
    }

    const handleCancel = () => {
        state.value.isOpen = false
        if (resolver) {
            resolver(false)
            resolver = null
        }
    }

    return {
        confirmState: state,
        confirmDialog,
        handleConfirm,
        handleCancel,
    }
}