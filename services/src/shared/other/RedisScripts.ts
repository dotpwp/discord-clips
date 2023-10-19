import { keyEncoderAwaken, keyEncoderState, keyQueueComplete, keyQueueLatest, keyQueueReencode } from "./RedisKeys";
import { Source } from "../../types/Encoder";
import { Cache } from "../util/Database";

/** 
 * These scripts will conduct a transaction in the database.
 * This prevents Video IDs from entering limbo (IDs that are not in any queue)
 * from a sudden crash or application restarting from an update.
*/

export const
    /**
     * Fetches a Video ID to work on. Checks Active Queue, then latest queue, then Re-Encoding Queue.
     * @argument KEYS[0] {string} Worker ID
     * @returns {[Source, string | null]} - [Source, VideoID(string) | null]
     */
    ScriptFindWork = Cache.scriptLoad(`
        -- Check for Active Work
        local WorkerID = tostring(KEYS[1])
        local ActiveID = redis.call("HGET", "${keyEncoderState}", WorkerID)
        if (ActiveID ~= false) then
            return {${Source.WorkerState}, ActiveID}
        end

        -- Check Latest Queue
        local LatestID = redis.call("SPOP", "${keyQueueLatest}")
        if (LatestID ~= false) then
            redis.call("HSET", "${keyEncoderState}", WorkerID, LatestID)
            return {${Source.Latest}, LatestID}
        end
        
        -- Check Re-Encoding Queue
        local ReencodeID = redis.call("SPOP", "${keyQueueReencode}")
        if (ReencodeID ~= false) then
            redis.call("HSET", "${keyEncoderState}", WorkerID, ReencodeID)
            return {${Source.Reencode}, ReencodeID}
        end

        -- No Work Available
        return {${Source.None}, nil}
    `),
    /**
     * Moves Active Video ID into Completed Queue
     * @argument KEYS[0] {string} Worker ID
     * @argument KEYS[1] {string?} Target Queue
     * @returns {[string, string]} - [WorkerID, TargetID]
     */
    ScriptTransferIDFromActive = Cache.scriptLoad(`
        local WorkerID = tostring(KEYS[1])
        local TargetID = tostring(KEYS[2])
        
        -- Retrieve ID from Active State
        local ActiveID = redis.call("HGET", "${keyEncoderState}", WorkerID)
        redis.call("HDEL", "${keyEncoderState}", WorkerID)
        
        -- Transfer ID to Desired Key
        if (ActiveID ~= false and TargetID ~= nil) then
            redis.call("SADD", TargetID, ActiveID)
        end

        return {WorkerID, TargetID}
    `),
    /** 
     * Moves all completed Video IDs to the Re-Encode Queue
     * Causes all currently available videos to add new formats
     * @argument KEYS[0] {string} Desired Version Hash 
     * @returns {number}
     * */
    ScriptMoveCompleteToReencode = Cache.scriptLoad(`
        -- [1] Pull State from Database
        local DesiredVersionHash = KEYS[1]
        local CurrentVersionHash = redis.call("HGET", "${keyEncoderState}", "version")

        -- [2] Move Completed Keys to Reencode Set
        local ItemsMoved = 0
        if (DesiredVersionHash ~= CurrentVersionHash) then
            while (true) do
                -- Fetch Key from List
                local CompleteKey = redis.call("SPOP", "${keyQueueComplete}")
                if (CompleteKey == false) then break end
                
                -- Add Key to List
                redis.call("SADD", "${keyQueueReencode}", CompleteKey)
                ItemsMoved = ItemsMoved + 1
            end

            -- Update Version in Database
            redis.call("HSET", "${keyEncoderState}", "version", DesiredVersionHash)
            redis.call("PUBLISH", "${keyEncoderAwaken}", "encode:queue:reencode")
        end
        
        return ItemsMoved
    `)