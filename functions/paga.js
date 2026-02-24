// file: functions/paga.js
export async function onRequest(context) {
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Api-Key, Correlation-Id",
    };

    if (context.request.method === "OPTIONS") { return new Response(null, { headers: corsHeaders }); }
    if (context.request.method !== "POST") { return new Response("Metodo non consentito", { status: 405, headers: corsHeaders }); }

    try {
        const body = await context.request.json();
        const { orderId, totalAmount } = body;
        
        const amountCents = Math.round(totalAmount * 100); 

        // CHIAMATA A NEXI
        const nexiUrl = "https://xpaysandbox.nexigroup.com/api/phoenix-0.0/psp/api/v1/orders/hpp"; // O Url produzione

        const nexiPayload = {
            "order": {
                "orderId": orderId,
                "amount": amountCents,
                "currency": "EUR"
            },
            "paymentSession": {
                "actionType": "PAY",
                "amount": amountCents,
                "resultUrl": "https://IL_TUO_SITO.pages.dev/successo.html", 
                "cancelUrl": "https://IL_TUO_SITO.pages.dev/errore.html"
                // Niente Webhook! Non serve tracciare gli slot.
            }
        };

        const nexiResponse = await fetch(nexiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Api-Key": context.env.NEXI_MAC_KEY, 
                "Correlation-Id": crypto.randomUUID()
            },
            body: JSON.stringify(nexiPayload)
        });

        const nexiData = await nexiResponse.json();

        if (nexiData.hostedPage) {
            return new Response(JSON.stringify({ success: true, redirectUrl: nexiData.hostedPage }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
        } else {
            throw new Error("Impossibile generare la pagina di cassa.");
        }

    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
}