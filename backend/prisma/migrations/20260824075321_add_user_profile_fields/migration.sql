-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('renter', 'host');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "address" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "phone" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "role" "UserRole";
