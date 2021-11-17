export type CommandResult = {
    success: boolean
    message?: string
}

export type CommandName = 'dst-build'

export type Command = {
    exec: (args: string[]) => Promise<CommandResult>
    description: string
    help: string
}

