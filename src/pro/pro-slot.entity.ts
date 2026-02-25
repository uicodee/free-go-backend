import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('pro_slots')
export class ProSlot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', default: 100 })
  total_slots: number;

  @Column({ type: 'int', default: 0 })
  taken_slots: number;

  @Column({ type: 'timestamptz' })
  promo_ends_at: Date;

  @Column({ type: 'int', default: 30 })
  pro_days: number;

  @Column({ type: 'varchar', nullable: true })
  pro_url: string | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
