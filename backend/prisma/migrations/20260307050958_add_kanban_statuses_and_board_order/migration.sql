-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TaskStatus" ADD VALUE 'OPEN';
ALTER TYPE "TaskStatus" ADD VALUE 'IN_REVIEW';
ALTER TYPE "TaskStatus" ADD VALUE 'CLOSED';

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "board_order" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "tasks_board_order_idx" ON "tasks"("board_order");
