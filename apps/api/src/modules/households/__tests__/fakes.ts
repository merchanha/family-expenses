import type { HouseholdRecord, InviteRecord, NewMember, UserIdentity } from '../domain/household';
import { HouseholdPatch, HouseholdRepository, MemberPatch, NewHousehold } from '../domain/household.repository';
import { InviteRepository, NewInvite } from '../domain/invite.repository';

let seq = 0;
const id = (p: string) => `${p}_${++seq}`;

export interface MemberRow extends NewMember {
  householdId: string;
}

export class InMemoryHouseholdRepository extends HouseholdRepository {
  readonly households = new Map<string, HouseholdRecord>();
  readonly members: MemberRow[] = [];
  readonly users = new Map<string, UserIdentity>();
  categoriesSeededFor: string[] = [];

  addUser(name: string, email: string): UserIdentity {
    const u = { id: id('user'), name, email };
    this.users.set(u.id, u);
    return u;
  }

  async createWithOwner(input: NewHousehold) {
    const h: HouseholdRecord = {
      id: id('hh'),
      name: input.name,
      defaultCurrency: input.defaultCurrency,
      timezone: input.timezone,
      defaultSplitPartner1Percent: 50,
      createdAt: new Date(),
    };
    this.households.set(h.id, h);
    this.members.push({ ...input.owner, householdId: h.id });
    this.categoriesSeededFor.push(h.id);
    return h.id;
  }
  async findById(householdId: string) {
    return this.households.get(householdId) ?? null;
  }
  async update(householdId: string, patch: HouseholdPatch) {
    this.households.set(householdId, { ...this.households.get(householdId)!, ...patch });
  }
  async updateMember(householdId: string, userId: string, patch: MemberPatch) {
    const m = this.members.find((r) => r.householdId === householdId && r.userId === userId)!;
    Object.assign(m, patch);
  }
  async countMembers(householdId: string) {
    return this.members.filter((m) => m.householdId === householdId).length;
  }
  async findHouseholdIdOfUser(userId: string) {
    return this.members.find((m) => m.userId === userId)?.householdId ?? null;
  }
  async findUser(userId: string) {
    return this.users.get(userId) ?? null;
  }
}

export class InMemoryInviteRepository extends InviteRepository {
  readonly rows: InviteRecord[] = [];
  constructor(private readonly households: InMemoryHouseholdRepository) {
    super();
  }
  async replacePending(invite: NewInvite) {
    this.rows
      .filter((r) => r.householdId === invite.householdId && r.status === 'PENDING')
      .forEach((r) => (r.status = 'REVOKED'));
    const row: InviteRecord = { ...invite, id: id('inv'), status: 'PENDING', createdAt: new Date() };
    this.rows.push(row);
    return row;
  }
  async findByTokenHash(tokenHash: string) {
    return this.rows.find((r) => r.tokenHash === tokenHash) ?? null;
  }
  async findById(householdId: string, inviteId: string) {
    return this.rows.find((r) => r.id === inviteId && r.householdId === householdId) ?? null;
  }
  async revoke(householdId: string, inviteId: string) {
    const r = await this.findById(householdId, inviteId);
    if (r && r.status === 'PENDING') r.status = 'REVOKED';
  }
  async accept(inviteId: string, householdId: string, member: NewMember, at: Date) {
    const r = await this.findById(householdId, inviteId);
    if (!r || r.status !== 'PENDING' || r.expiresAt <= at) return false;
    r.status = 'ACCEPTED';
    this.households.members.push({ ...member, householdId });
    return true;
  }
}
