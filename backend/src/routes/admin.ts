import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import * as controller from "../controllers/adminController";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Admin routes (superuser only)
router.get("/users", asyncHandler(controller.listAllUsers));
router.get("/stats", asyncHandler(controller.getSystemStats));
router.get("/organizations", asyncHandler(controller.listAllOrganizations));
router.get("/audit-logs", asyncHandler(controller.getAllAuditLogs));
router.delete("/users/:id", asyncHandler(controller.deleteUser));
router.put("/users/:id/role", asyncHandler(controller.updateUserRole));

export default router;
