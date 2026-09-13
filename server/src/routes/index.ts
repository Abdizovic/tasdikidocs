import { Router } from "express";
import authRoutes from "./auth.routes";
import institutionsRoutes from "./institutions.routes";
import certificatesRoutes from "./certificates.routes";
import adminRoutes from "./admin.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/institutions", institutionsRoutes);
router.use("/certificates", certificatesRoutes);
router.use("/admin", adminRoutes);

export default router;
