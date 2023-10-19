import { WriteStream, closeSync, createReadStream, createWriteStream, existsSync, openSync, readSync, renameSync, rm } from "fs";
import { BLU, CYN, GRN, GRY, RED, RST, YEL } from "../other/ConsoleColors";
import { envProd, serviceName } from "../..";
import Unique from "./Unique";
import Path from "./Path";
import { createGzip } from "zlib";
import { inspect } from "util";
import { join } from "path";

export const enum Severity {
    HTTP = "HTTP",
    TEST = "TEST",
    FAIL = "FAIL",
    INFO = "INFO",
    WARN = "WARN",
}

const SeverityColors = {
    [Severity.HTTP]: `${GRY}HTTP${RST}`,
    [Severity.TEST]: `${GRN}TEST${RST}`,
    [Severity.FAIL]: `${RED}FAIL${RST}`,
    [Severity.INFO]: `${BLU}INFO${RST}`,
    [Severity.WARN]: `${YEL}WARN${RST}`,
}

class Froppy {
    private fileOutput = this.createLogStream("froppy")

    /**
     * Creates a log file, automatically renames and compresses older file 
     * @param name - {name}.{timestamp}.log
     * @returns {WriteStream | null} - Returns null while in testing environment
     */
    public createLogStream(sinkName: string): WriteStream | null {
        const latestPath = join(
            Path.privateLogsDirectory,
            `${serviceName}.${sinkName}.latest.log`
        )

        // Compress and Rename Log file
        // - Will only do this in production
        // - Will always default to latest in development
        if (existsSync(latestPath) && envProd) {

            // [1A] Fetch Timestamp from Log [SYNC]
            const fileContent = Buffer.alloc(64)
            const fileDescriptor = openSync(latestPath, "r")
            readSync(fileDescriptor, fileContent, 0, fileContent.length, 0)
            closeSync(fileDescriptor)

            // [1B] Parse Timestamp [SYNC]
            let timestampLine = fileContent
                .toString().split("\n")
                .find(l => l.startsWith("> Timestamp: "))
            if (!timestampLine) timestampLine = "> Timestamp: 0"

            let timestamp = parseInt(timestampLine.slice(timestampLine.indexOf(": ") + 2))
            if (isNaN(timestamp)) timestamp = 0

            // [2A] Rename Log [SYNC]
            const isoString = new Date(timestamp).toISOString()
            const renamedPath = join(
                Path.privateLogsDirectory,
                `${serviceName}.${sinkName}.${isoString}.log`
            )
            renameSync(latestPath, renamedPath)

            // [3A] Compress Log
            const gzip = createGzip({})
            const reader = createReadStream(renamedPath)
            const writer = createWriteStream(renamedPath + ".gz")
            reader.pipe(gzip).pipe(writer)

            // [4A] Delete Log & Close Files
            reader.once("end", () => gzip.end())
            gzip.once("end", () => writer.end())
            writer.once("close", () => rm(renamedPath, () => { }))
        }

        // Create New Log Stream
        const file = createWriteStream(latestPath)
        file.write(
            "Froppy at your service! ＞︿＜\n" +
            `> Timestamp: ${new Date().getTime()}\n` +
            `> Service: "${serviceName}"\n` +
            `> Sink: "${sinkName}"\n\n`
        )
        return file
    }

    /**
     * Froppy Logging Function. Recommend to use the helper functions.
     * @param severity - Log Severity
     * @param service - Uppercase Service Name
     * @param message - Human Friendly Message
     * @param data - Optional Object to include in logs
     * @returns {string} - Entry ID
     * @example
     * Returns:
     * 5373179810447098882
     * Console:
     * 5373179810447098882 13:49:07.832 INFO @ EXPRESS: Bound 2 0.0.0.0:3000
     */
    public custom(severity: Severity, service: string, message: string, data?: object): string {
        const T = new Date()
        const ID = Unique.generateSnowflake().toString()
        const Timestamp = `${T.toTimeString().slice(0, 8)}.${T.getMilliseconds().toString().padStart(3, "0")}`

        // Write to Console (With Color)
        process.stdout.write(
            `${GRY}${ID} ${Timestamp}${RST} ` +
            `${GRN}${SeverityColors[severity]}${RST} @ ` +
            `${CYN}${service}${RST}: ` +
            `${message} \n`
        )
        if (data) {
            process.stdout.write(inspect(data, false, Infinity, true))
            process.stdout.write("\n")
        }

        // Write to File (Without Color)
        if (this.fileOutput) {
            this.fileOutput.write(`${ID} ${Timestamp} ${severity} @ ${service}: ${message} \n`)
            if (data) {
                this.fileOutput.write(inspect(data, false, Infinity, false))
                this.fileOutput.write(`\n`)
            }
        }
        return ID
    }

    /**
     * Creates an entry with severity of "DEBUG".
     * @param service - Service Name 
     * @param message - Engineer Message
     * @param data - Optional Object to include
     * @returns {string} - Entry ID
     */
    public debug(service: string, message: string, data?: object): string {
        return this.custom(Severity.TEST, service, message, data)
    }
    /**
     * Creates an entry with severity of "ERROR".
     * @param service - Service Name 
     * @param message - Engineer Message
     * @param data - Optional Object to include
     * @returns {string} - Entry ID
     */
    public error(service: string, message: string, data?: { error: any, [key: string]: object; }): string {
        return this.custom(Severity.FAIL, service, message, data)
    }
    /**
     * Creates an entry with severity of "INFO".
     * @param service - Service Name 
     * @param message - Engineer Message
     * @param data - Optional Object to include
     * @returns {string} - Entry ID
     */
    public info(service: string, message: string, data?: object): string {
        return this.custom(Severity.INFO, service, message, data)
    }
    /**
     * Creates an entry with severity of "WARN".
     * @param service - Service Name 
     * @param message - Engineer Message
     * @param data - Optional Object to include
     * @returns {string} - Entry ID
     */
    public warn(service: string, message: string, data?: object): string {
        return this.custom(Severity.WARN, service, message, data)
    }
}
export default new Froppy()