import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('bot_messages')
export class BotMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'int', default: 0 })
  sent_count: number;

  @Column({ nullable: true, type: 'varchar' })
  sent_by_telegram_id: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
