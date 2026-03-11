/*
  Warnings:

  - You are about to drop the column `assigned_to_id` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `task_id` on the `time_entries` table. All the data in the column will be lost.
  - You are about to drop the column `organization_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `_TaskTags` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_TimeEntryTags` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tags` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_TaskTags" DROP CONSTRAINT "_TaskTags_A_fkey";

-- DropForeignKey
ALTER TABLE "_TaskTags" DROP CONSTRAINT "_TaskTags_B_fkey";

-- DropForeignKey
ALTER TABLE "_TimeEntryTags" DROP CONSTRAINT "_TimeEntryTags_A_fkey";

-- DropForeignKey
ALTER TABLE "_TimeEntryTags" DROP CONSTRAINT "_TimeEntryTags_B_fkey";

-- DropForeignKey
ALTER TABLE "tags" DROP CONSTRAINT "tags_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_assigned_to_id_fkey";

-- DropForeignKey
ALTER TABLE "time_entries" DROP CONSTRAINT "time_entries_task_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_organization_id_fkey";

-- DropIndex
DROP INDEX "tasks_assigned_to_id_idx";

-- DropIndex
DROP INDEX "time_entries_task_id_idx";

-- DropIndex
DROP INDEX "users_organization_id_idx";

-- AlterTable
ALTER TABLE "tasks" DROP COLUMN "assigned_to_id";

-- AlterTable
ALTER TABLE "time_entries" DROP COLUMN "task_id";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "organization_id",
DROP COLUMN "role";

-- DropTable
DROP TABLE "_TaskTags";

-- DropTable
DROP TABLE "_TimeEntryTags";

-- DropTable
DROP TABLE "tags";

-- CreateTable
CREATE TABLE "organization_members" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AssignedTasks" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AssignedTasks_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_TimeEntryTasks" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TimeEntryTasks_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "organization_members_user_id_idx" ON "organization_members"("user_id");

-- CreateIndex
CREATE INDEX "organization_members_organization_id_idx" ON "organization_members"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_user_id_organization_id_key" ON "organization_members"("user_id", "organization_id");

-- CreateIndex
CREATE INDEX "_AssignedTasks_B_index" ON "_AssignedTasks"("B");

-- CreateIndex
CREATE INDEX "_TimeEntryTasks_B_index" ON "_TimeEntryTasks"("B");

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AssignedTasks" ADD CONSTRAINT "_AssignedTasks_A_fkey" FOREIGN KEY ("A") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AssignedTasks" ADD CONSTRAINT "_AssignedTasks_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TimeEntryTasks" ADD CONSTRAINT "_TimeEntryTasks_A_fkey" FOREIGN KEY ("A") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TimeEntryTasks" ADD CONSTRAINT "_TimeEntryTasks_B_fkey" FOREIGN KEY ("B") REFERENCES "time_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
