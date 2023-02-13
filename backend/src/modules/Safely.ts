class Safely {

    // Returns false if this is not a bigint
    public parseBigInt(someString: string): bigint | false {
        try {
            return BigInt(someString);
        } catch (_) {
            return false;
        };
    };

    public async call<T>(somePromise: T): Promise<[Awaited<T> | null, any]> {
        try {
            return [await somePromise, undefined];
        } catch (err) {
            return [null, err];
        }
    }

};

export default new Safely();