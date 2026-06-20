# Tool Tracking App — Feature Spec & Build Plan
### For Cursor: Context, Requirements, and Implementation Plan

---

## What We're Building & Why

This document outlines two changes to an existing field tool management SaaS app:

1. **A minor modification** to the existing employer-side tool claim flow
2. **A brand new employee personal tool inventory section** built from scratch

The app is a **digital inventory, tracking, and documentation tool** for trade contractors — primarily targeting union shops. It is **not** a legal compliance tool, not a contract interpreter, and makes no coverage determinations. It is record-keeping software that naturally satisfies documentation requirements common across most U.S. trade union collective bargaining agreements (plumbers, pipefitters, HVAC, electricians, carpenters, operating engineers, etc.) without being written specifically for any one union or contract.

The goal is to give employers and employees a clean digital paper trail — timestamped, photo-documented, and acknowledgment-captured — that can be referenced in the event of a tool dispute, insurance claim, or labor grievance. **What that paper trail means legally or contractually is the user's responsibility to determine, not the app's.**

---

## Who This Is For

- **Employers / Contractors** — signatory to union agreements, managing fleets of tools distributed to field technicians
- **Employees / Field Technicians** — tradespeople who carry both employer-issued tools and their own personal tools on the job
- **Union Business Managers & Shop Stewards** — who need to verify that proper documentation exists

The app is designed to be useful to **non-union shops as well** — the personal inventory and sign-out features have value regardless of union affiliation (insurance documentation, tax records, personal asset tracking, etc.).

---

## Where These Requirements Come From

The feature design is informed by the **UA Local Union 725 / MCASF Collective Bargaining Agreement (July 19, 2019 – July 15, 2022)** as a representative example. Similar tool accountability language exists in most U.S. trade union CBAs. The relevant contract language is quoted below.

### Relevant Contract Language — Verbatim

**Section 7.06A — Employee-Provided Tools:**
> "Employees performing service or maintenance work may be required to furnish their own hand tools. Employee-provided hand tools shall not exceed fourteen (14) inches in length. No Employee may lend or lease his car, truck, welding or power equipment to his Employer. Tools supplied by the Employee to the Employer that are broken, damaged, or stolen, shall be repaired or replaced by the Employer. All service Employees shall furnish the Local Union Business Manager and the Employer a written, itemized inventory on a standard form mutually agreed on by the Union and the Association, of all hand tools furnished by the Employee. The Employer shall have the right to limit the value of all hand tools furnished by the Employee."

**Section 7.06B — Employer-Provided Tools:**
> "Pipe threading and pipe cutting tools, vises, welding torches, power tools and instruments for measuring temperatures, pressure, air velocities, voltages, amperages, etc., shall not be deemed hand tools and shall be furnished by the Employer. Employees shall be responsible for tools and instruments supplied by the Employer, provided mutual security arrangements are made in the form of locked tool boxes, etc., and the Employee has signed an inventory slip. Cases of carelessness or negligence, in disregard of the preceding sentence, shall be cause for referral to the Joint Labor Management Committee. Establishment of such carelessness or negligence shall make the Employee liable for replacement of lost tools and shall be cause for termination. Tools that are stolen must be reported to the police, and a report of said incident must be recorded. The Employee shall account for all tools, issued properties and materials belonging to the Employer upon termination of employment, provided Employee has signed an inventory slip."

### What The Contract Actually Requires (Minimum Bar)

For **employee-owned tools**, the contract requires:
- A **written, itemized** list (each tool listed individually)
- Submitted to **both the employer and the union Business Manager**
- Nothing else is specified — no serial numbers, no photos, no specific fields beyond "itemized"

For **employer-provided tools**, the contract requires:
- Employee has **signed an inventory slip** acknowledging receipt
- **Mutual security arrangements** confirmed (locked storage)
- A record in the event of **theft** (police report reference)
- Employee **accounts for all tools upon termination**

The app's photo-based inventory approach **exceeds** the minimum contractual requirements, which strengthens its value proposition without creating legal exposure.

---

## What Is Already Built

The **employer-side tool management** is substantially complete:
- Employer can add tools to inventory
- Employees can claim/sign out tools
- Basic tracking is in place

**What needs to be modified** on the employer side is minor — the claim/sign-out flow needs an acknowledgment moment that creates a clear record of the employee accepting responsibility, satisfying the "signed an inventory slip" requirement.

---

## Feature 1: Employer Tool Claim Flow — Modification

### Current State
Employee claims a tool from the employer inventory. Basic record is created.

### What To Add
A single acknowledgment screen inserted into the existing claim flow, **before** the claim is finalized.

### Acknowledgment Screen Requirements
- Display the tool name, description, and condition photo(s)
- Show a simple acknowledgment statement:
  > *"By claiming this tool I confirm I have received it in the described condition, accept responsibility for its care and proper use, and confirm that secure storage is available."*
- Require one of the following to confirm:
  - Digital signature input, **or**
  - Tap-to-confirm button with printed name entry
- Capture and store:
  - Employee name
  - Date and timestamp
  - Confirmation method used
  - Optional: photo of tool condition at time of sign-out

### What This Creates
A timestamped, acknowledged digital sign-out record that satisfies the "signed an inventory slip" requirement present in most union CBAs. In a dispute, the employer can pull up this record to show the employee accepted responsibility and confirmed secure storage was available.

### What This Does NOT Do
The app does not state that this makes the employee liable under any specific contract. It is a documentation record. What it means in a dispute is for the parties and their representatives to determine.

---

## Feature 2: Employee Personal Tool Inventory — New Section

### Overview
A brand new section of the app, separate from employer tools, where individual employees can build and maintain a personal inventory of their own tools. This is the employee's own record — not the employer's. The employee owns this data.

### Why It Exists
- Satisfies the "written, itemized inventory" requirement common in union CBAs
- Useful for insurance claims if personal tools are stolen or damaged on a job site
- Useful for tax documentation (tool deductions)
- Useful for personal asset tracking across multiple employers over a career
- Completely independent of union affiliation — valuable to any tradesperson

### Entry Flow — Add a Tool
Keep it simple. When an employee adds a tool to their personal inventory:

**Required:**
- Tool name / description (free text — e.g. "Klein lineman's pliers")
- One or more photos
  - Encourage photos that naturally capture brand, model, and serial number so no separate fields are needed
  - Suggested prompt in UI: *"Tip: include a photo showing the brand label and any serial number"*
- Date added to inventory (auto-populated, editable)

**Optional:**
- Estimated value
- Notes field (free text — condition notes, purchase info, anything)

**Design Philosophy:**
Photos are the primary record. A clear photo of the tool with brand/model/serial visible is more useful in a real dispute than form fields. Don't over-engineer the data entry. The goal is that a tech in the field can add a tool in under 30 seconds.

### My Tools — Inventory View
- List view of all personal tools
- Thumbnail photo for each
- Tool name and date added
- Tap to expand full record (all photos, notes, value, etc.)
- Search/filter capability

### Export & Share — Critical Feature
This is the feature that satisfies the "submitted to both employer and union Business Manager" requirement.

**Implementation:**
- "Export Inventory" button on the My Tools screen
- Generates a clean PDF of the full personal tool inventory
  - Employee name and date at the top
  - Each tool listed with photo thumbnail, name, description, estimated value, date added, notes
- Triggers the **native iOS/Android share sheet**
  - User can email, text, save to files, print, etc.
  - Pre-populate email subject line: *"Personal Tool Inventory — [Employee Name] — [Date]"*
- **Optional enhancement:** In company/employer settings, allow the employer to pre-enter the union Business Manager's email address so it auto-populates when the employee goes to share

**Liability shift:** Once the export/share button exists and the employee is shown it, the act of actually sending it to the union Business Manager is entirely the employee's responsibility. The app's job is to make it easy, not to enforce it.

**Status indicator** on the My Tools screen:
- "Inventory last exported: [date]" — or "Not yet exported"
- Timestamp of when they last tapped the share button
- This is not a guarantee of delivery, just a record that the action was taken

---

## What The App Is and Is Not — For UI Language Guidance

When writing any UI copy, error messages, onboarding text, or tooltips, keep this framing in mind:

**The app IS:**
- A digital record-keeping tool
- An inventory and photo documentation system
- A timestamped sign-out and acknowledgment log
- A tool that makes existing documentation requirements easier to satisfy

**The app IS NOT:**
- A legal compliance platform
- A contract interpreter
- A guarantee of coverage under any union agreement or insurance policy
- A substitute for consulting your union representative or legal counsel

Somewhere in onboarding or settings, include one simple line — does not need to be prominent:
> *"This app is a record-keeping tool and does not constitute legal, contractual, or compliance advice. Users should consult their collective bargaining agreement and union representatives regarding specific coverage questions."*

---

## Summary of All Changes

| Area | Type | What |
|---|---|---|
| Employer tool claim flow | **Modify existing** | Add acknowledgment screen with statement + signature/confirm before claim finalizes |
| Employer tool claim flow | **Modify existing** | Capture condition photo at time of sign-out (optional) |
| Employee personal tools | **Build new** | "My Tools" section — personal inventory with photos and basic fields |
| Employee personal tools | **Build new** | Add tool flow — name, photos, optional value/notes |
| Employee personal tools | **Build new** | PDF export + native share sheet trigger |
| Employee personal tools | **Build new** | Export status indicator showing last export date |
| Company/employer settings | **Minor addition** | Optional field for union Business Manager email (pre-populates export share) |

---

## Out of Scope For This Build

- The app will not determine whether any specific tool is "covered" under a union agreement
- The app will not integrate directly with union hall systems
- The app will not enforce submission deadlines or notify the union automatically
- The app will not distinguish between hand tools and power tools for coverage purposes — all tools can be inventoried regardless of category
- The app will not make any statements about employer liability for specific tool types

---

*Document prepared based on review of UA Local 725 / MCASF CBA (2019–2022) as a representative union agreement. Feature design intentionally kept general to apply across multiple union agreements nationwide.*
