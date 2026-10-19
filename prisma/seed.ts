import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;

function daysFromNow(days: number): Date {
  const now = new Date();
  return new Date(now.getTime() + days * DAY);
}

function dateOnly(days: number): Date {
  const date = daysFromNow(days);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

async function main(): Promise<void> {
  const email = "demo@davt.test";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.info(`Seed skipped: ${email} already exists.`);
    return;
  }

  const user = await prisma.user.create({
    data: {
      name: "Demo User",
      email,
      password: await bcrypt.hash("Password123!", 10),
      role: "User",
      emailVerifiedAt: new Date(),
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: `${user.name}'s Workspace`,
      slug: `personal-${user.id}`,
      isPersonal: true,
      members: {
        create: { userId: user.id, role: "Owner", joinedAt: new Date() },
      },
    },
  });

  const projectA = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      createdBy: user.id,
      name: "Website Redesign",
      description: "Peluncuran ulang website marketing.",
      status: "Active",
      startDate: dateOnly(-14),
      dueDate: dateOnly(21),
    },
  });

  const projectB = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      createdBy: user.id,
      name: "Mobile App MVP",
      description: "Aplikasi mobile lintas platform.",
      status: "On Hold",
      startDate: dateOnly(-7),
      dueDate: dateOnly(45),
    },
  });

  const taskSeeds: Array<{
    projectId: number;
    title: string;
    description?: string;
    type: string;
    status: string;
    priority: string;
    dueDate?: Date;
    estimatedHours?: number;
    actualHours?: number;
    completedAt?: Date;
    assigneeId?: number;
  }> = [
    {
      projectId: projectA.id,
      title: "Audit halaman landing",
      description: "Inventarisasi halaman lama dan masalah UX.",
      type: "Research",
      status: "Done",
      priority: "Medium",
      dueDate: dateOnly(-5),
      estimatedHours: 8,
      actualHours: 9.5,
      completedAt: daysFromNow(-4),
    },
    {
      projectId: projectA.id,
      title: "Rancang design system",
      type: "Feature",
      status: "Done",
      priority: "High",
      dueDate: dateOnly(-2),
      estimatedHours: 16,
      actualHours: 14,
      completedAt: daysFromNow(-1),
    },
    {
      projectId: projectA.id,
      title: "Implementasi hero section",
      type: "Feature",
      status: "In Progress",
      priority: "High",
      dueDate: dateOnly(-1),
      estimatedHours: 12,
      actualHours: 6,
    },
    {
      projectId: projectA.id,
      title: "Perbaiki CTA checkout",
      description: "Konversi turun sejak rilis terakhir.",
      type: "Bug",
      status: "Blocked",
      priority: "Critical",
      dueDate: dateOnly(1),
      estimatedHours: 4,
    },
    {
      projectId: projectA.id,
      title: "Optimasi gambar hero",
      type: "Maintenance",
      status: "To Do",
      priority: "Low",
      dueDate: dateOnly(3),
      estimatedHours: 3,
    },
    {
      projectId: projectA.id,
      title: "Review copy bahasa Indonesia",
      type: "Support",
      status: "In Review",
      priority: "Medium",
      dueDate: dateOnly(5),
      estimatedHours: 5,
      actualHours: 2,
    },
    {
      projectId: projectB.id,
      title: "Pilih stack lintas platform",
      type: "Research",
      status: "Done",
      priority: "High",
      dueDate: dateOnly(-3),
      estimatedHours: 6,
      actualHours: 7,
      completedAt: daysFromNow(-2),
    },
    {
      projectId: projectB.id,
      title: "Scaffold aplikasi",
      type: "Feature",
      status: "In Progress",
      priority: "Medium",
      dueDate: dateOnly(7),
      estimatedHours: 10,
      actualHours: 3,
    },
    {
      projectId: projectB.id,
      title: "Integrasi API auth",
      type: "Feature",
      status: "Backlog",
      priority: "Medium",
      dueDate: dateOnly(14),
      estimatedHours: 8,
    },
    {
      projectId: projectB.id,
      title: "Setup pipeline CI mobile",
      type: "Maintenance",
      status: "Backlog",
      priority: "Low",
      dueDate: dateOnly(20),
      estimatedHours: 4,
    },
  ];

  const tasks = [];
  for (const seed of taskSeeds) {
    tasks.push(
      await prisma.task.create({
        data: {
          ...seed,
          createdBy: user.id,
          completedAt: seed.completedAt ?? null,
        },
      }),
    );
  }

  await prisma.taskActivityLog.create({
    data: {
      taskId: tasks[2].id,
      userId: user.id,
      action: "created",
      changes: {
        status: { old: null, new: "Backlog" },
        priority: { old: null, new: "High" },
      },
    },
  });

  await prisma.taskActivityLog.create({
    data: {
      taskId: tasks[2].id,
      userId: user.id,
      action: "status_changed",
      changes: { status: { old: "To Do", new: "In Progress" } },
    },
  });

  await prisma.taskActivityLog.create({
    data: {
      taskId: tasks[3].id,
      userId: user.id,
      action: "created",
      changes: {
        status: { old: null, new: "Backlog" },
        priority: { old: null, new: "Critical" },
      },
    },
  });

  await prisma.taskActivityLog.create({
    data: {
      taskId: tasks[3].id,
      userId: user.id,
      action: "updated",
      changes: {
        status: { old: "In Progress", new: "Blocked" },
        blocked_reason: { old: null, new: "Menunggu keputusan pricing." },
      },
    },
  });

  console.info(
    `Seeded demo user ${email} with workspace "${workspace.name}", ` +
      `2 projects and ${tasks.length} tasks.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
