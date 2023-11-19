import { Hono } from "hono";
import { drizzle } from 'drizzle-orm/d1';
import { eq } from "drizzle-orm";
import { text, integer, sqliteTable } from "drizzle-orm/sqlite-core";
import { bearerAuth } from 'hono/bearer-auth';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import format from "date-fns/format";
import { formatDistanceToNowStrict } from 'date-fns';
import { token } from "./token";

type Bindings = {
	IDENTITY_DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', secureHeaders()); 
app.use('/*', cors());
app.use('/*', bearerAuth({ token }));

const users = sqliteTable('user', {
	id: text('id').notNull(),
    username: text('username').notNull(),
    email: text('email').notNull().default(''),
});

app.post('/sendemail', async (c) => {

	try {
		const requestBody: Birthday = await c.req.json();
	
		const db = drizzle(c.env.IDENTITY_DB);
		const user = await db.select().from(users).where(eq(users.id, requestBody.userId));
		
		// ?dry-run=true
		const res = await fetch('https://api.mailchannels.net/tx/v1/send', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
			},
			body: JSON.stringify({
				personalizations: [
					{
					to: [{ email: user[0].email }],
					},
				],
				from: {
					email: 'reminder@birthdays.run',
					name: 'Birthday Reminders',
				},
				subject: requestBody.name +  `'s Birthday`,
				content: [
					{
						type: 'text/html',
						value: contents(requestBody),
					},
				],
			}),
		}).then(res => res.json());
		return c.json({ message: 'Message sent', ok: true });

	} catch (err) {
		return c.json({ message: 'Error occured', error: err, ok: false })
	}
	
});

export default app;

interface Birthday {
	id: string
	userId: string
	month: number;
	day: number;
	nextBirthday: number;
	name: string;
	lastName?: string;
	onDay: boolean;
	dayBefore: boolean;
	oneWeekBefore: boolean;
	twoWeeksBefore: boolean;
};

const contents = (birthdayObj: Birthday) => {

	const reminders = [];
    if (birthdayObj.onDay) reminders.push("On Day");
    if (birthdayObj.dayBefore) reminders.push("Day Before");
    if (birthdayObj.oneWeekBefore) reminders.push("1 Week Before");
    if (birthdayObj.twoWeeksBefore) reminders.push("2 Weeks Before");

	if (!birthdayObj.lastName) {
		birthdayObj.lastName = "";
	}

	const distance = formatDistanceToNowStrict(new Date(birthdayObj.nextBirthday), {
		unit: 'day',
		roundingMethod: 'round',
		addSuffix: true
	});

	let message = "";
	if (distance === "0 days ago" || distance === "in 0 days" || distance === "1 day ago") message = "today!";
	if (distance === "in 1 day") message = "tomorrow";
	if (distance === "in 7 days" || distance === "in 6 days" || distance === "in 8 days") message = "in 1 week";
	if (distance === "in 14 days" || distance === "in 13 days" || distance === "in 15 days") message = "in 2 weeks";

	const formattedDate = format(new Date(birthdayObj.nextBirthday), "LLLL do");

return (`

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<title>Birthday Reminder</title>
<html lang="en">

  <head data-id="__react-email-head"></head>

  <body data-id="__react-email-body" style="background-color:rgb(255,255,255);margin-top:auto;margin-bottom:auto;margin-left:auto;margin-right:auto;font-family:ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol, Noto Color Emoji">
    <table align="center" width="100%" data-id="__react-email-container" role="presentation" cellSpacing="0" cellPadding="0" border="0" style="max-width:37.5em;margin-top:40px;margin-bottom:40px;margin-left:auto;margin-right:auto;padding-left:20px;padding-right:20px;width:465px">
      <tbody>
        <tr style="width:100%">
          <td>
            <table align="center" width="100%" data-id="react-email-section" border="0" cellPadding="0" cellSpacing="0" role="presentation">
              <tbody>
                <tr>
                  <td>
                    <p data-id="react-email-text" style="font-size:0.875rem;line-height:1.25rem;margin:20px 0;color:rgb(100,116,139)">A reminder from <a href="https://birthdays.run" data-id="react-email-link" target="_blank" style="color:rgb(37,99,235);text-decoration:none;text-decoration-line:none">Birthdays.run</a></p>
                  </td>
                </tr>
              </tbody>
            </table>
            <table align="center" width="100%" data-id="react-email-section" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="margin-top:2rem">
              <tbody>
                <tr>
                  <td><img data-id="react-email-img" alt="Vercel" src="https://birthdays.run/birthdays.svg" height="96" style="display:block;outline:none;border:none;text-decoration:none;margin-top:0px;margin-bottom:0px;margin-left:auto;margin-right:auto" /></td>
                </tr>
              </tbody>
            </table>
            <p data-id="react-email-text" style="font-size:1.25rem;line-height:1.75rem;margin:16px 0;font-weight:500;margin-top:2.5rem;text-align:center">${birthdayObj.name}&#x27;s birthday is ${message}</p>
            <p data-id="react-email-text" style="font-size:1.25rem;line-height:1.75rem;margin:16px 0;font-weight:500;margin-bottom:2.5rem;text-align:center">On ${formattedDate}</p>
            <hr data-id="react-email-hr" style="width:100%;border:none;border-top:1px solid #eaeaea" />
            <p data-id="react-email-text" style="font-size:0.875rem;line-height:1.25rem;margin:16px 0;font-weight:500;margin-top:2.5rem">Name: ${birthdayObj.name} ${birthdayObj.lastName} </p>
            <p data-id="react-email-text" style="font-size:0.875rem;line-height:1.25rem;margin:16px 0;font-weight:500">Reminders: ${reminders.join(", ")}</p>
          </td>
        </tr>
      </tbody>
    </table>
  </body>

</html>
`)
}


