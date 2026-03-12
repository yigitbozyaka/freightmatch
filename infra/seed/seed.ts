import dotenv from 'dotenv';
import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcrypt';

dotenv.config();

// ─── Configuration ───────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/?directConnection=true';
const SALT_ROUNDS = 10;

// Helper: build a connection URI with the database name inserted correctly
function buildDbUri(baseUri: string, dbName: string): string {
  const url = new URL(baseUri);
  url.pathname = '/' + dbName;
  return url.toString();
}

// ─── User Schema (mirrors user-service/src/models/user.model.ts) ───
type TruckType = 'flatbed' | 'refrigerated' | 'dry-van' | 'tanker';

interface ICarrierProfile {
  truckType: TruckType;
  capacityKg: number;
  homeCity: string;
  rating: number;
  completedShipments: number;
}

interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  role: 'Shipper' | 'Carrier';
  carrierProfile?: ICarrierProfile;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ['Shipper', 'Carrier'] },
    carrierProfile: {
      type: {
        truckType: { type: String, required: true, enum: ['flatbed', 'refrigerated', 'dry-van', 'tanker'] },
        capacityKg: { type: Number, required: true },
        homeCity: { type: String, required: true },
        rating: { type: Number, default: 0, min: 0, max: 5 },
        completedShipments: { type: Number, default: 0, min: 0 },
      },
      required: false,
      _id: false,
    },
  },
  { timestamps: true },
);

// ─── Load Schema (mirrors load-service/src/models/load.model.ts) ───
type LoadStatus = 'Draft' | 'Posted' | 'Matched' | 'InTransit' | 'Delivered' | 'Cancelled';

interface IStatusHistoryEntry {
  from: LoadStatus | null;
  to: LoadStatus;
  timestamp: Date;
}

interface ILoad extends Document {
  _id: mongoose.Types.ObjectId;
  shipperId: string;
  title: string;
  origin: string;
  destination: string;
  cargoType: string;
  weightKg: number;
  deadlineHours: number;
  status: LoadStatus;
  statusHistory: IStatusHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const statusHistorySchema = new Schema<IStatusHistoryEntry>(
  {
    from: { type: String, default: null },
    to: { type: String, required: true },
    timestamp: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const loadSchema = new Schema<ILoad>(
  {
    shipperId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    origin: { type: String, required: true, trim: true },
    destination: { type: String, required: true, trim: true },
    cargoType: { type: String, required: true },
    weightKg: { type: Number, required: true },
    deadlineHours: { type: Number, required: true },
    status: {
      type: String,
      required: true,
      enum: ['Draft', 'Posted', 'Matched', 'InTransit', 'Delivered', 'Cancelled'],
      default: 'Draft',
    },
    statusHistory: { type: [statusHistorySchema], default: [] },
  },
  { timestamps: true },
);

// ─── Seed Data Definitions ───────────────────────────────────

const PLAIN_PASSWORD = 'password123';

interface UserSeed {
  email: string;
  role: 'Shipper' | 'Carrier';
  carrierProfile?: ICarrierProfile;
}

const userSeeds: UserSeed[] = [
  // Shippers
  { email: 'shipper1@demo.com', role: 'Shipper' },
  { email: 'shipper2@demo.com', role: 'Shipper' },
  // Carriers
  {
    email: 'carrier1@demo.com',
    role: 'Carrier',
    carrierProfile: {
      truckType: 'refrigerated',
      capacityKg: 2000,
      homeCity: 'Istanbul',
      rating: 4.5,
      completedShipments: 12,
    },
  },
  {
    email: 'carrier2@demo.com',
    role: 'Carrier',
    carrierProfile: {
      truckType: 'dry-van',
      capacityKg: 5000,
      homeCity: 'Ankara',
      rating: 4.0,
      completedShipments: 28,
    },
  },
  {
    email: 'carrier3@demo.com',
    role: 'Carrier',
    carrierProfile: {
      truckType: 'flatbed',
      capacityKg: 8000,
      homeCity: 'Izmir',
      rating: 3.8,
      completedShipments: 7,
    },
  },
];

interface LoadSeed {
  title: string;
  origin: string;
  destination: string;
  cargoType: string;
  weightKg: number;
  deadlineHours: number;
  status: LoadStatus;
}

const loadSeeds: LoadSeed[] = [
  // 2 × Draft
  {
    title: 'Draft: Electronics Shipment',
    origin: 'Istanbul',
    destination: 'Ankara',
    cargoType: 'electronics',
    weightKg: 500,
    deadlineHours: 48,
    status: 'Draft',
  },
  {
    title: 'Draft: Textile Shipment',
    origin: 'Izmir',
    destination: 'Istanbul',
    cargoType: 'textile',
    weightKg: 1200,
    deadlineHours: 72,
    status: 'Draft',
  },
  // 2 × Posted (for matching service demo)
  {
    title: 'Fresh Produce Delivery',
    origin: 'Istanbul',
    destination: 'Bursa',
    cargoType: 'perishable',
    weightKg: 1800,
    deadlineHours: 24,
    status: 'Posted',
  },
  {
    title: 'Construction Materials',
    origin: 'Ankara',
    destination: 'Izmir',
    cargoType: 'construction',
    weightKg: 4500,
    deadlineHours: 96,
    status: 'Posted',
  },
  // 1 × InTransit
  {
    title: 'Automotive Parts Express',
    origin: 'Istanbul',
    destination: 'Antalya',
    cargoType: 'automotive',
    weightKg: 3000,
    deadlineHours: 36,
    status: 'InTransit',
  },
];

// ─── Helper: Build statusHistory for a given target status ───
function buildStatusHistory(targetStatus: LoadStatus): IStatusHistoryEntry[] {
  const flow: LoadStatus[] = ['Draft', 'Posted', 'Matched', 'InTransit', 'Delivered'];
  const now = new Date();
  const history: IStatusHistoryEntry[] = [];

  // Always start with null → Draft
  history.push({ from: null, to: 'Draft', timestamp: new Date(now.getTime() - 4 * 86400000) });

  if (targetStatus === 'Draft') return history;

  const transitions: { from: LoadStatus; to: LoadStatus }[] = [];
  for (let i = 0; i < flow.length - 1; i++) {
    transitions.push({ from: flow[i], to: flow[i + 1] });
    if (flow[i + 1] === targetStatus) break;
  }

  transitions.forEach((t, idx) => {
    history.push({
      from: t.from,
      to: t.to,
      timestamp: new Date(now.getTime() - (3 - idx) * 86400000),
    });
  });

  return history;
}

// ─── Main Seed Function ──────────────────────────────────────
async function seed(): Promise<void> {
  console.log('🌱 FreightMatch Seed Script');
  console.log('══════════════════════════════════════════');
  console.log(`📡 Connecting to MongoDB: ${MONGODB_URI}`);

  // Create separate connections for each database (matches service architecture)
  const userConn = await mongoose.createConnection(buildDbUri(MONGODB_URI, 'freightmatch-users')).asPromise();
  const loadConn = await mongoose.createConnection(buildDbUri(MONGODB_URI, 'freightmatch-loads')).asPromise();

  console.log('✅ Connected to MongoDB\n');

  const User = userConn.model<IUser>('User', userSchema);
  const Load = loadConn.model<ILoad>('Load', loadSchema);

  // ── Seed Users ──────────────────────────────────────────
  console.log('👤 Seeding Users...');
  console.log('──────────────────────────────────────────');

  const passwordHash = await bcrypt.hash(PLAIN_PASSWORD, SALT_ROUNDS);
  let shipper1Id: string = '';

  for (const userData of userSeeds) {
    const existing = await User.findOne({ email: userData.email });
    if (existing) {
      console.log(`  ⏭️  ${userData.role} "${userData.email}" zaten mevcut — atlandı`);
      if (userData.email === 'shipper1@demo.com') {
        shipper1Id = existing._id.toString();
      }
      continue;
    }

    const user = await User.create({
      email: userData.email,
      passwordHash,
      role: userData.role,
      carrierProfile: userData.carrierProfile,
    });

    if (userData.email === 'shipper1@demo.com') {
      shipper1Id = user._id.toString();
    }

    console.log(`  ✅ ${userData.role} "${userData.email}" eklendi`);
  }

  if (!shipper1Id) {
    throw new Error('shipper1@demo.com bulunamadı veya oluşturulamadı!');
  }

  console.log(`\n  ℹ️  shipper1 ID: ${shipper1Id}`);

  // ── Seed Loads ──────────────────────────────────────────
  console.log('\n📦 Seeding Loads...');
  console.log('──────────────────────────────────────────');

  for (const loadData of loadSeeds) {
    const existing = await Load.findOne({ title: loadData.title });
    if (existing) {
      console.log(`  ⏭️  "${loadData.title}" [${loadData.status}] zaten mevcut — atlandı`);
      continue;
    }

    await Load.create({
      shipperId: shipper1Id,
      title: loadData.title,
      origin: loadData.origin,
      destination: loadData.destination,
      cargoType: loadData.cargoType,
      weightKg: loadData.weightKg,
      deadlineHours: loadData.deadlineHours,
      status: loadData.status,
      statusHistory: buildStatusHistory(loadData.status),
    });

    console.log(`  ✅ "${loadData.title}" [${loadData.status}] eklendi`);
  }

  // ── Summary ─────────────────────────────────────────────
  const userCount = await User.countDocuments();
  const loadCount = await Load.countDocuments();
  const postedCount = await Load.countDocuments({ status: 'Posted' });

  console.log('\n══════════════════════════════════════════');
  console.log('📊 Seed Sonuçları:');
  console.log(`   Toplam Kullanıcı : ${userCount}`);
  console.log(`   Toplam Yük       : ${loadCount}`);
  console.log(`   Posted Yük       : ${postedCount} (Matching demo için)`);
  console.log('══════════════════════════════════════════');
  console.log('🎉 Seed işlemi başarıyla tamamlandı!\n');

  // ── Cleanup ─────────────────────────────────────────────
  await userConn.close();
  await loadConn.close();
}

// ─── Run ─────────────────────────────────────────────────────
seed().catch((err) => {
  console.error('❌ Seed hatası:', err);
  process.exit(1);
});
