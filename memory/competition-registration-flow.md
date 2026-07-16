# Competition registration flow

How an athlete registers for a competition ("giải đấu"). This is the **design spec** transcribed from the process flowcharts — a frontend wizard flow plus its backend checks. It is **not yet implemented**: there is no registration endpoint under `server/api/` (closest is [server/api/auth/register.post.ts](../server/api/auth/register.post.ts), which is account signup, a different thing). Treat this as the intended behaviour to build against, and verify against code once it lands.

Throughout, "user" = athlete. "CCCD" is the Vietnamese citizen ID card. "Giải" / "giải đấu" = the competition/meet.

## 1. Identity gate

The wizard starts by checking whether the account has been **identity verified**, this refers to the verification form user have to fill in after registering.

- **Already verified** → go straight to the ban-list checks (§2), then show the athlete's saved personal info for review.
- **Not verified yet** → the athlete fills the verification form now. The ban-list checks are **skipped** on this path (at this point the system considers the non verified athletes as new athletes so they can't be banned beforehand).

## 2. Ban-list checks (verified athletes only)

Run in order; each is a gate. The backend looks up the athlete's verified CCCD.

1. **User violation ban**  — three outcomes, with level being the number of entry in the user violations table, consider the expire year in relation to system year of each competition:
   - **Level 2** → blocked: show notice and end.
   - **Level 1** → allowed to continue, but the athlete must **write a commitment/pledge and pay a fine** ("viết cam kết, đóng phạt"), the page will show a notification regarding this but an email will be sent manually to handle both the work.
   - **No ban** → continue.
2. **Doping ban list** — if listed, show notice and end; otherwise continue.
3. **Competition ban list** ("ban list giải") — the per-competition exclusion list. If listed, show the popup below and end; otherwise proceed to registration.

The block popup (literal UI copy, with `A`/`B`/`C`/`D`/`E` as placeholders):

> **Vận động viên A** nằm trong danh sách không được đăng ký **giải B**. Lý do: đã giành HCV hạng cân C tại giải đấu D (hoặc: đã tham gia thi đấu tại giải đấu E). Nếu phát hiện nhầm lẫn, vui lòng liên hệ VPF tại đây (chèn link page contact).

(*Athlete A is on the list of those not allowed to register for competition B. Reason: won a gold medal in weight class C at competition D (or: already competed at competition E). If you believe this is a mistake, please contact VPF here.*)

There will be a separate table to store per competition ban list with reason.

## 4. Registration capacity: VPF member vs Guest lifter

An option button chooses how the athlete competes:

- **VPF member** — must accept the **VPF membership terms** ("Điều khoản membership VPF…"), a mandatory checkbox, then continue.
- **Guest lifter** — for athletes who are members of **another IPF-affiliated powerlifting federation**. Skips the membership-terms step.

Both paths then hit the mandatory **data-usage consent** checkbox ("Tôi đồng ý v/v sử dụng dữ liệu…") — required to proceed to the next step.

## 5. Competition entry details ("Điền thông tin thi đấu")

User fill in a competition data form, including
- Sport gender
- Weight class 
- Age division
- Rack pin, footblock (data in users table, optional)
- Competition profile picture (data in users table)

The system derives the valid options from the athlete's real data — the athlete does not pick freely:

- **Weight class** ("Hạng cân") — system uses sporting gender + real age to show only the weight classes valid for that gender and age.
- **Age category** ("Độ tuổi") — backend computes real age from DOB to show only valid age categories. Example: a 2026 competition with an athlete born in 2006 shows only **Junior / Open**.

See [Powerlifting domain rules](powerlifting-domain-rules.md) for the weight-class and division definitions this must line up with.

## 6. Add-ons

Optional extras registered before payment: **Media Plus** 

## 7. VPF Membership fee

User must pay a membership fee of 200000VND if havent paid for this year (relation to system year of competition)

## 8. Payment and confirmation

Payment mirrors the [VIP purchase flow](vip-purchase-flow.md) — Vietnamese bank transfer, not a card processor:

- Backend computes the amount due (with any discount applied) and generates a **random 6-character transaction ID**.
- Frontend shows the matching **QR image** and **auto-refreshes in the background** until the app auto-detects the incoming transfer (bank/phone payment notification), then shows the result.

The final message depends on verification status:

- **CCCD already admin-verified** → success:
  > Xin cảm ơn và chúc mừng bạn đã thành công đăng ký tham gia thi đấu tại giải đấu A.

  (*Thank you and congratulations — you have successfully registered to compete at competition A.*)

- **CCCD not yet admin-verified** → pending review:
  > Xin cảm ơn bạn đã đăng ký tham gia thi đấu tại giải đấu A. Trạng thái đăng ký hiện tại là "Đã gửi thông tin đăng ký". Thông tin đăng ký của bạn sẽ được VPF kiểm tra trong thời gian sớm nhất có thể. Nếu sau 7-10 ngày làm việc kể từ thời điểm hiện tại, nếu bạn chưa nhận được email xác nhận đăng ký hoặc trạng thái đăng ký của giải đấu A tại đây (chèn link trang quản lý tài khoản web VPF) vẫn chưa được cập nhật thành "Đăng ký thành công", xin vui lòng liên hệ VPF để được kiểm tra và giải quyết.

  (*Thank you for registering for competition A. Your current status is "Registration submitted". VPF will review it as soon as possible. If after 7–10 working days you have not received a confirmation email, or the status here has not updated to "Registration successful", please contact VPF.*)

So an **unverified** athlete can still pay and register, but lands in a *submitted / pending admin review* state rather than *confirmed*.
