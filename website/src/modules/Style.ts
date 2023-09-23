class Style {
    public classIf(condition: boolean, truthy: string, falsy: string, others = "") {
        return `${condition ? truthy : falsy} ${others}`
    }
}

export default new Style()