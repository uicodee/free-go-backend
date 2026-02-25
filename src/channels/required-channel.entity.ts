import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('required_channels')
export class RequiredChannel {
  @PrimaryGeneratedColumn()
  id: number;

  // e.g. "@mychannel" or "-1001234567890"
  @Column({ unique: true })
  channel_id: string;

  // Display title shown to user
  @Column()
  title: string;

  // Optional invite link (e.g. https://t.me/+NJyMgDFAK-djM2Vi) used for the button URL
  @Column({ nullable: true, type: 'varchar' })
  invite_link: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
