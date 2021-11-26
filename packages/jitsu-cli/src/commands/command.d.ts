export type CommandResult = {
    success: true
} | { success: false, message: string, details?: string }

export type CommandName = 'destination'

export type Command = {
    exec: (args: string[]) => Promise<CommandResult>
    description: string
    help: string
}

