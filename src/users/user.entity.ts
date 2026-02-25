import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint', unique: true })
  telegram_id: string; // pg returns bigint as string

  @Column({ nullable: true, type: 'varchar' })
  username: string | null;

  @Column()
  first_name: string;

  @Column({ nullable: true, type: 'varchar' })
  last_name: string | null;

  @Column({ nullable: true, type: 'varchar' })
  language_code: string | null;

  @Column({ nullable: true, type: 'varchar' })
  photo_url: string | null;

  @Column({ default: false })
  is_bot: boolean;

  @Column({ unique: true, length: 12 })
  referral_code: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'referred_by_id' })
  referred_by: User | null;

  @Column({ nullable: true, type: 'int' })
  referred_by_id: number | null;

  @Column({ type: 'int', default: 0 })
  referral_count: number;

  @Column({ default: false })
  is_pro: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  pro_until: Date | null;

  @Column({ default: false })
  is_admin: boolean;

  @Column({ default: false })
  is_banned: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
