export function buildMentionEmailHtml(
  projectName: string,
  authorName: string,
  commentBody: string,
  viewUrl: string
): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f5f7fa;margin:0;padding:32px 0">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#2563EB,#7C3AED);padding:32px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:24px;letter-spacing:-0.5px">ArxisVR</h1>
      <p style="color:rgba(255,255,255,.8);margin:8px 0 0;font-size:14px">Notificação de Menção</p>
    </div>
    <div style="padding:32px">
      <h2 style="margin:0 0 16px;color:#111827;font-size:20px">Você foi mencionado por <strong>${authorName}</strong>! 👋</h2>
      <p style="color:#4b5563;margin:0 0 12px;line-height:1.6">
        No projeto <strong>${projectName}</strong>, um comentário foi adicionado mencionando você:
      </p>
      <div style="background:#f3f4f6;border-left:4px solid #7C3AED;padding:16px;border-radius:4px;margin-bottom:24px;font-style:italic;color:#1f2937">
        "${commentBody}"
      </div>
      <div style="text-align:center;margin:0 0 24px">
        <a href="${viewUrl}"
           style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#2563EB,#7C3AED);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">
          Ver Comentário no Viewer
        </a>
      </div>
    </div>
  </div>
</body>
</html>
`;
}
