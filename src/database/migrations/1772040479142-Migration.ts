import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1772040479142 implements MigrationInterface {
    name = 'Migration1772040479142'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users" ("id" SERIAL NOT NULL, "telegram_id" bigint NOT NULL, "username" character varying, "first_name" character varying NOT NULL, "last_name" character varying, "language_code" character varying, "photo_url" character varying, "is_bot" boolean NOT NULL DEFAULT false, "referral_code" character varying(12) NOT NULL, "referred_by_id" integer, "referral_count" integer NOT NULL DEFAULT '0', "is_pro" boolean NOT NULL DEFAULT false, "pro_until" TIMESTAMP WITH TIME ZONE, "is_admin" boolean NOT NULL DEFAULT false, "is_banned" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_1a1e4649fd31ea6ec6b025c7bfc" UNIQUE ("telegram_id"), CONSTRAINT "UQ_ba10055f9ef9690e77cf6445cba" UNIQUE ("referral_code"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "pro_slots" ("id" SERIAL NOT NULL, "total_slots" integer NOT NULL DEFAULT '100', "taken_slots" integer NOT NULL DEFAULT '0', "promo_ends_at" TIMESTAMP WITH TIME ZONE NOT NULL, "pro_days" integer NOT NULL DEFAULT '30', "pro_url" character varying, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_03d5275b820e30fc49e6e0e86f9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "required_channels" ("id" SERIAL NOT NULL, "channel_id" character varying NOT NULL, "title" character varying NOT NULL, "invite_link" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_20e5ac6b855be798bc23a0acd8e" UNIQUE ("channel_id"), CONSTRAINT "PK_e6e85aa921bfb2dbc3211708cc5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "bot_messages" ("id" SERIAL NOT NULL, "text" text NOT NULL, "sent_count" integer NOT NULL DEFAULT '0', "sent_by_telegram_id" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_333da6c5e0aa0eb4d6e8eec1b61" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_a78a00605c95ca6737389f6360b" FOREIGN KEY ("referred_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_a78a00605c95ca6737389f6360b"`);
        await queryRunner.query(`DROP TABLE "bot_messages"`);
        await queryRunner.query(`DROP TABLE "required_channels"`);
        await queryRunner.query(`DROP TABLE "pro_slots"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
