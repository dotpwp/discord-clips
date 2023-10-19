import { FlagsAll } from "../../types/Permission";

class Flags {
    /**
     * Test permissions for given array of flags.
     * @param permissions - Permissions that they have.
     * @param flags - Flags to test for.
     * @returns {boolean} - Whether or not all flags are present.
     */
    public test(flags: number, ...testFor: FlagsAll[]): boolean {
        return testFor.every(f => (flags & f) === f);
    }

    /**
     * Easily Merge Flags
     * @param flags - Flags to Merge
     * @returns 
     */
    public merge(...flags: FlagsAll[]): number {
        let flagCounter = 0;
        flags.forEach(flag => flagCounter = flagCounter | flag);
        return flagCounter;
    }
}
export default new Flags()