import { Router } from "express";
import healthRoutes from "./health";
import organizationsRoutes from "./organizations";
import environmentsRoutes from "./environments";
import zonesRoutes from "./zones";
import dnsRecordsRoutes from "./dnsRecords";
import profilesRoutes from "./profiles";
import auditLogsRoutes from "./auditLogs";
import adminRoutes from "./admin";

const router = Router();

// Mount all route modules
router.use("/health", healthRoutes);
router.use("/organizations", organizationsRoutes);
router.use("/environments", environmentsRoutes);
router.use("/zones", zonesRoutes);
router.use("/dns-records", dnsRecordsRoutes);
router.use("/profiles", profilesRoutes);
router.use("/audit-logs", auditLogsRoutes);
router.use("/admin", adminRoutes);

export default router;
