-- CreateEnum
CREATE TYPE "EnumNotificationType" AS ENUM ('CLIP_PROCESSED', 'CLIP_HEARTED');

-- CreateEnum
CREATE TYPE "EnumVideoAvailability" AS ENUM ('UNAVAILABLE', 'PROCESSING', 'READY');

-- CreateEnum
CREATE TYPE "EnumContainerType" AS ENUM ('MP4', 'WEBM', 'WEBP');

-- CreateEnum
CREATE TYPE "EnumVideoCodec" AS ENUM ('H264', 'VP9', 'AV1');

-- CreateEnum
CREATE TYPE "EnumAudioCodec" AS ENUM ('NONE', 'AAC', 'OPUS');

-- CreateTable
CREATE TABLE "User" (
    "id" BIGSERIAL NOT NULL,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readNotificationsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastNotificationAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "avatar" TEXT,
    "alias" TEXT NOT NULL,
    "uploadCount" INTEGER NOT NULL DEFAULT 0,
    "permissions" JSONB NOT NULL DEFAULT '{}'
);

-- CreateTable
CREATE TABLE "Server" (
    "id" BIGSERIAL NOT NULL,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "allowGuests" BOOLEAN NOT NULL DEFAULT false,
    "categoryCount" INTEGER NOT NULL DEFAULT 0,
    "uploadCount" INTEGER NOT NULL DEFAULT 0,
    "webhooks" JSONB NOT NULL DEFAULT '[]'
);

-- CreateTable
CREATE TABLE "Category" (
    "id" BIGSERIAL NOT NULL,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serverId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'folder',
    "flags" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Heart" (
    "id" BIGSERIAL NOT NULL,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" BIGINT NOT NULL,
    "clipId" BIGINT NOT NULL
);

-- CreateTable
CREATE TABLE "Clip" (
    "id" BIGSERIAL NOT NULL,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" BIGINT NOT NULL,
    "serverId" BIGINT NOT NULL,
    "categoryId" BIGINT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "thumbnail" TEXT,
    "preview" TEXT,
    "duration" INTEGER NOT NULL,
    "approximateViewCount" INTEGER NOT NULL DEFAULT 0,
    "approximateHeartCount" INTEGER NOT NULL DEFAULT 0,
    "approximateCommentCount" INTEGER NOT NULL DEFAULT 0,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "availability" "EnumVideoAvailability" NOT NULL DEFAULT 'PROCESSING',
    "encoderOptions" JSONB NOT NULL DEFAULT '{}',
    "reason" TEXT
);

-- CreateTable
CREATE TABLE "Format" (
    "id" BIGSERIAL NOT NULL,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clipId" BIGINT NOT NULL,
    "encodingTime" INTEGER NOT NULL,
    "container" "EnumContainerType" NOT NULL,
    "videoCodec" "EnumVideoCodec" NOT NULL,
    "videoFramerate" INTEGER NOT NULL,
    "videoBitrate" INTEGER NOT NULL,
    "videoWidth" INTEGER NOT NULL,
    "videoHeight" INTEGER NOT NULL,
    "audioCodec" "EnumAudioCodec" NOT NULL,
    "audioBitrate" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" BIGSERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" BIGINT NOT NULL,
    "type" "EnumNotificationType" NOT NULL,
    "heartId" BIGINT,
    "clipId" BIGINT
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" BIGSERIAL NOT NULL,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replyId" BIGINT NOT NULL,
    "clipId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "message" TEXT NOT NULL,
    "edited" BOOLEAN NOT NULL DEFAULT false,
    "deleted" BOOLEAN NOT NULL DEFAULT false
);

-- CreateIndex
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Server_id_key" ON "Server"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Category_id_key" ON "Category"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Heart_id_key" ON "Heart"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Heart_userId_clipId_key" ON "Heart"("userId", "clipId");

-- CreateIndex
CREATE UNIQUE INDEX "Clip_id_key" ON "Clip"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Format_id_key" ON "Format"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_id_key" ON "Notification"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_type_userId_clipId_key" ON "Notification"("type", "userId", "clipId");

-- CreateIndex
CREATE UNIQUE INDEX "Comment_id_key" ON "Comment"("id");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Heart" ADD CONSTRAINT "Heart_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "Clip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Heart" ADD CONSTRAINT "Heart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clip" ADD CONSTRAINT "Clip_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clip" ADD CONSTRAINT "Clip_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clip" ADD CONSTRAINT "Clip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Format" ADD CONSTRAINT "Format_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "Clip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_heartId_fkey" FOREIGN KEY ("heartId") REFERENCES "Heart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "Clip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "Comment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "Clip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
