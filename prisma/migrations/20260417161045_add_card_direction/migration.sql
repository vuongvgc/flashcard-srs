-- DropIndex
DROP INDEX "CardState_card_id_user_id_key";

-- AlterTable
ALTER TABLE "CardState" ADD COLUMN     "direction" TEXT NOT NULL DEFAULT 'normal';

-- CreateIndex
CREATE UNIQUE INDEX "CardState_card_id_user_id_direction_key" ON "CardState"("card_id", "user_id", "direction");
