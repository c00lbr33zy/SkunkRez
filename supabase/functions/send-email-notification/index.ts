import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ReservationData {
  venueName: string;
  venueAddress: string;
  date: string;
  time: string;
  tableNumber: string;
  guestCount: number;
  customerName: string;
  customerEmail: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");

    if (!sendgridApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "SendGrid API key not configured. Please set SENDGRID_API_KEY in your environment variables.",
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const reservationData: ReservationData = await req.json();

    const formattedDate = new Date(reservationData.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const emailData = {
      personalizations: [
        {
          to: [
            {
              email: reservationData.customerEmail,
              name: reservationData.customerName,
            },
          ],
          subject: `Reservation Confirmed - ${reservationData.venueName}`,
        },
      ],
      from: {
        email: "noreply@reservations.com",
        name: "Restaurant Reservations",
      },
      content: [
        {
          type: "text/html",
          value: `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background-color: #1e293b; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                  .content { background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
                  .details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
                  .detail-row { display: flex; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
                  .detail-label { font-weight: bold; width: 120px; color: #64748b; }
                  .detail-value { color: #1e293b; }
                  .footer { text-align: center; color: #64748b; font-size: 14px; margin-top: 20px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1 style="margin: 0;">Reservation Confirmed!</h1>
                  </div>
                  <div class="content">
                    <p>Hi ${reservationData.customerName},</p>
                    <p>Your reservation has been confirmed. We're looking forward to serving you!</p>

                    <div class="details">
                      <h2 style="margin-top: 0; color: #1e293b;">Reservation Details</h2>
                      <div class="detail-row">
                        <div class="detail-label">Restaurant:</div>
                        <div class="detail-value">${reservationData.venueName}</div>
                      </div>
                      <div class="detail-row">
                        <div class="detail-label">Date:</div>
                        <div class="detail-value">${formattedDate}</div>
                      </div>
                      <div class="detail-row">
                        <div class="detail-label">Time:</div>
                        <div class="detail-value">${reservationData.time}</div>
                      </div>
                      <div class="detail-row">
                        <div class="detail-label">Table:</div>
                        <div class="detail-value">${reservationData.tableNumber}</div>
                      </div>
                      <div class="detail-row">
                        <div class="detail-label">Guests:</div>
                        <div class="detail-value">${reservationData.guestCount}</div>
                      </div>
                      <div class="detail-row" style="border-bottom: none;">
                        <div class="detail-label">Address:</div>
                        <div class="detail-value">${reservationData.venueAddress}</div>
                      </div>
                    </div>

                    <p>If you need to make any changes or cancel your reservation, please contact us directly.</p>
                    <p>See you soon!</p>

                    <div class="footer">
                      <p>This is an automated message. Please do not reply to this email.</p>
                    </div>
                  </div>
                </div>
              </body>
            </html>
          `,
        },
      ],
    };

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${sendgridApiKey}`,
      },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SendGrid API error: ${error}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
