export default async function pcall(promise: any): Promise<[boolean, any]> {
    try {
        const results = await promise;
        return [true, results];
    } catch (err) {
        return [false, err];
    }
}