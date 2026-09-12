const origin = 'https://arxisvr.avilaops.com';
const feedUrl = origin + '/feed.xml';
const byUrl = new Map();
const now = Date.now();
const clean = (value) => typeof value === 'string'
  ? value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  : '';
for (const item of $input.all()) {
  const source = item.json ?? {};
  const match = clean(source.link).match(/^https:\/\/arxisvr\.avilaops\.com\/blog\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?(?:[?#].*)?$/);
  const title = clean(source.title).slice(0, 220);
  const published = Date.parse(source.isoDate || source.pubDate || '');
  if (!match || !title || !Number.isFinite(published) || published > now) continue;
  const url = origin + '/blog/' + match[1];
  const candidate = {
    chave: 'arxis-blog-v1|' + url,
    titulo: title,
    url,
    publicadoEm: new Date(published).toISOString(),
    resumo: clean(source.contentSnippet || source.description || source.content).slice(0, 700),
    fonte: feedUrl,
    estado: 'candidato para revisao editorial',
    redes: {
      instagram: 'https://www.instagram.com/arxis.bim',
      formatoSugerido: 'Carrossel educativo ou roteiro curto, conforme a planilha de 360 dias',
      direcao: 'Extrair uma duvida pratica do artigo e mostrar o caminho para responde-la. Manter logo original, azul petroleo, branco e laranja. Avatar Arxis quando ajudar a explicacao.',
      chamada: 'Confira o artigo completo no blog Arxis.',
    },
    prospeccao: {
      publico: 'Escritorios de arquitetura, engenharia e coordenacao BIM',
      criterio: 'Selecionar empresas com necessidade observavel de revisar modelos ou comunicar decisoes de projeto.',
      preparacao: 'Registrar empresa, pagina publica de origem, necessidade observada e relacao com o artigo antes de preparar abordagem individual.',
      proximoPasso: 'Revisar a pauta e preparar uma abordagem util ao contexto do contato.',
    },
    revisao: ['Conferir artigo fonte e recursos realmente disponiveis', 'Consultar a planilha antes de criar nova arte', 'Evitar promessas de economia ou resultados sem evidencia', 'Aprovar conteudo e destinatario antes de qualquer envio'],
  };
  const previous = byUrl.get(url);
  if (!previous || previous.publicadoEm < candidate.publicadoEm) byUrl.set(url, candidate);
}
return [...byUrl.values()]
  .sort((a, b) => b.publicadoEm.localeCompare(a.publicadoEm) || a.url.localeCompare(b.url))
  .slice(0, 3)
  .map((json) => ({ json }));
