import { Router } from "express";
import { db } from "../db/Database";
import { resolvePrincipalFromRequest } from "../security/SecurityContext";

export const adminRoutes = Router();

// Ensure seed data exists helper
const ensureSeedData = () => {
  try {
    db.prepare(`
      INSERT OR IGNORE INTO tenants (id, name, code, status, createdAt) VALUES 
      ('tenant-pt-health', 'PT Health Indonesia', 'PTHI', 'ACTIVE', '2026-08-01T00:00:00.000Z')
    `).run();

    db.prepare(`
      INSERT OR IGNORE INTO hospital_groups (id, tenantId, name, code, status, createdAt) VALUES 
      ('group-nusantara', 'tenant-pt-health', 'Nusantara Hospital Group', 'NHG', 'ACTIVE', '2026-08-01T00:00:00.000Z')
    `).run();

    db.prepare(`
      INSERT OR IGNORE INTO hospitals (id, tenantId, groupId, name, code, status, timezone, createdAt) VALUES 
      ('hospital-jkt', 'tenant-pt-health', 'group-nusantara', 'RS BPJS Utama Jakarta', 'RS001', 'ACTIVE', 'Asia/Jakarta', '2026-08-01T00:00:00.000Z'),
      ('hospital-bks', 'tenant-pt-health', 'group-nusantara', 'RS BPJS Bekasi', 'RS002', 'ACTIVE', 'Asia/Jakarta', '2026-08-01T00:00:00.000Z'),
      ('hospital-bdg', 'tenant-pt-health', 'group-nusantara', 'RS BPJS Bandung', 'RS003', 'ACTIVE', 'Asia/Jakarta', '2026-08-01T00:00:00.000Z')
    `).run();

    db.prepare(`
      INSERT OR IGNORE INTO users (id, tenantId, name, email, status, createdAt) VALUES 
      ('usr-admin-001', 'tenant-pt-health', 'Platform Admin', 'admin@bpjsoptimizer.id', 'ACTIVE', '2026-08-01T00:00:00.000Z'),
      ('usr-casemix-001', 'tenant-pt-health', 'Casemix Officer', 'casemix@hospital-jkt.id', 'ACTIVE', '2026-08-01T00:00:00.000Z'),
      ('usr-coder-001', 'tenant-pt-health', 'Coder Casemix', 'coder@hospital-jkt.id', 'ACTIVE', '2026-08-01T00:00:00.000Z'),
      ('usr-doctor-001', 'tenant-pt-health', 'dr. DPJP Sp.PD', 'dr.dpjp@hospital-jkt.id', 'ACTIVE', '2026-08-01T00:00:00.000Z'),
      ('usr-hosp-001', 'tenant-pt-health', 'Hospital Admin', 'hospadmin@hospital-jkt.id', 'ACTIVE', '2026-08-01T00:00:00.000Z'),
      ('usr-audit-001', 'tenant-pt-health', 'Auditor BPJS', 'auditor@bpjs.go.id', 'ACTIVE', '2026-08-01T00:00:00.000Z')
    `).run();
  } catch (e) {
    console.warn("Admin seed check:", e);
  }
};

// GET Tenants
adminRoutes.get("/api/admin/tenants", async (req, res) => {
  try {
    ensureSeedData();
    const tenants = db.prepare("SELECT * FROM tenants ORDER BY name ASC").all();
    res.json({ status: "success", count: tenants.length, tenants });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET Hospital Groups
adminRoutes.get("/api/admin/groups", async (req, res) => {
  try {
    ensureSeedData();
    const principal = resolvePrincipalFromRequest(req);
    let groups = db.prepare("SELECT * FROM hospital_groups WHERE tenantId = ? ORDER BY name ASC").all(principal.tenantId);
    if (!groups || groups.length === 0) {
      groups = db.prepare("SELECT * FROM hospital_groups ORDER BY name ASC").all();
    }
    res.json({ status: "success", count: groups.length, groups });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET Hospitals
adminRoutes.get("/api/admin/hospitals", async (req, res) => {
  try {
    ensureSeedData();
    const principal = resolvePrincipalFromRequest(req);
    let hospitals = db.prepare("SELECT * FROM hospitals WHERE tenantId = ? ORDER BY name ASC").all(principal.tenantId);
    if (!hospitals || hospitals.length === 0) {
      hospitals = db.prepare("SELECT * FROM hospitals ORDER BY name ASC").all();
    }
    res.json({ status: "success", count: hospitals.length, hospitals });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE Hospital
adminRoutes.post("/api/admin/hospitals", async (req, res) => {
  try {
    ensureSeedData();
    const { name, code, groupId, timezone } = req.body;
    const principal = resolvePrincipalFromRequest(req);

    if (!name || !code) {
      return res.status(400).json({ error: "Name and Code are required." });
    }

    const id = `hospital-${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO hospitals (id, tenantId, groupId, name, code, status, timezone, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, principal.tenantId || "tenant-pt-health", groupId || "group-nusantara", name, code, "ACTIVE", timezone || "Asia/Jakarta", now, now);

    res.json({ status: "success", message: `Hospital '${name}' created successfully.`, hospitalId: id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET Users & Roles
adminRoutes.get("/api/admin/users", async (req, res) => {
  try {
    ensureSeedData();
    const principal = resolvePrincipalFromRequest(req);
    let users = db.prepare("SELECT * FROM users WHERE tenantId = ? ORDER BY name ASC").all(principal.tenantId);
    if (!users || users.length === 0) {
      users = db.prepare("SELECT * FROM users ORDER BY name ASC").all();
    }
    res.json({ status: "success", count: users.length, users });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET Active Context
adminRoutes.get("/api/admin/context", async (req, res) => {
  try {
    ensureSeedData();
    const principal = resolvePrincipalFromRequest(req);
    const tenant = db.prepare("SELECT * FROM tenants WHERE id = ?").get(principal.tenantId);
    const group = db.prepare("SELECT * FROM hospital_groups WHERE id = ?").get(principal.groupId);
    const hospital = db.prepare("SELECT * FROM hospitals WHERE id = ?").get(principal.hospitalId);

    res.json({
      status: "success",
      scope: {
        tenantId: principal.tenantId,
        groupId: principal.groupId,
        hospitalId: principal.hospitalId,
        userId: principal.userId,
        role: principal.role
      },
      tenant,
      group,
      hospital
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
