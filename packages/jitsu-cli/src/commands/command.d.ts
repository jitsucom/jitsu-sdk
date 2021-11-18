export type CommandResult = {
    success: boolean
    message?: string
}

export type CommandName = 'destination build'

export type Command = {
    exec: (args: string[]) => Promise<CommandResult>
    description: string
    help: string
}

