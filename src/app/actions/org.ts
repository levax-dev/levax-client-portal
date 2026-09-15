"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

import { ACTIVE_ORG_COOKIE } from "@/lib/auth"

export async function setActiveOrg(orgId: string) {
  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_ORG_COOKIE, orgId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: false,
    sameSite: "lax",
  })
  revalidatePath("/", "layout")
}
