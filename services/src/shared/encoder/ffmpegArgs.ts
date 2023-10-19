/** Makes Arguments easier to manage */
export class ffmpegArgs {
    public _args = ["-y", "-hide_banner", "-loglevel", "error"]

    public if(condition: any, onTrue: string[]) {
        if (condition) this._args.push(...onTrue)
        return this
    }
    public add(...args: string[]) {
        this._args.push(...args)
        return this
    }
    public get(): string[] {
        return this._args
    }
}