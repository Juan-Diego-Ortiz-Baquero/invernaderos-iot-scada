import { useMemo, useState } from 'react';
import { askAssistant } from '../../services/invernaderosApi.js';
import { getDefaultTimeRange, getQuickTimeRange, toTimeRangeQuery } from '../../utils/timeRange.js';

const suggestionSets = [
  [
    'Que paso hoy?',
    'Que variables estan fuera de rango?',
    'Que acciones recomiendas?',
    'Que tendencia tuvo la temperatura?',
  ],
  [
    'Cuantas lecturas tuvimos hoy?',
    'Compara hoy con ayer',
    'Como va la humedad del suelo?',
    'Que paso en las ultimas 24 horas?',
  ],
  [
    'Como estuvo la luz esta tarde?',
    'Que alertas criticas hay?',
    'Como va la calidad del aire?',
    'Resumen de esta semana',
  ],
];

const variableDictionary = [
  {
    key: 'temperature',
    words: ['temperatura', 'temp', 'grados', 'calor', 'frio', 'fria', 'caliente'],
  },
  {
    key: 'humidity',
    words: ['humedad del aire', 'humedad aire', 'humedad ambiental', 'humedad', 'ambiente'],
  },
  {
    key: 'soil',
    words: ['humedad del suelo', 'humedad suelo', 'suelo', 'tierra', 'sustrato', 'maceta'],
  },
  {
    key: 'light',
    words: ['luminosidad', 'luz', 'iluminacion', 'lux', 'lx'],
  },
  {
    key: 'air',
    words: ['calidad del aire', 'calidad aire', 'aire', 'gas', 'gases', 'ppm', 'humo', 'co2'],
  },
];

const pad = (value) => String(value).padStart(2, '0');

function normalizeText(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function toAssistantDateTime(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}:00`;
}

function inferQuickRange(question, fallbackRange) {
  const normalized = normalizeText(question.trim());

  if (normalized.includes('ayer')) return getQuickTimeRange('yesterday');
  if (normalized.includes('hoy desde 07') || normalized.includes('hoy desde las 07')) return getQuickTimeRange('todayFrom7');
  if (normalized.includes('hoy completo')) return getQuickTimeRange('today');
  if (normalized.includes('hoy')) return getQuickTimeRange('today');
  if (normalized.includes('esta semana') || normalized.includes('semana actual')) return getQuickTimeRange('thisWeek');
  if (normalized.includes('este mes') || normalized.includes('mes actual')) return getQuickTimeRange('thisMonth');
  if (normalized.includes('manana')) return getQuickTimeRange('morning');
  if (normalized.includes('tarde')) return getQuickTimeRange('afternoon');
  if (normalized.includes('noche')) return getQuickTimeRange('night');
  if (normalized.includes('ultimas 24 horas') || normalized.includes('ultima 24 horas') || normalized.includes('24 horas')) {
    return getQuickTimeRange('last24h');
  }
  if (normalized.includes('ultimas 4 horas') || normalized.includes('ultima 4 horas') || normalized.includes('4 horas')) {
    return getQuickTimeRange('last4h');
  }

  return fallbackRange;
}

function detectVariableFromQuestion(question) {
  const normalized = normalizeText(question);
  return variableDictionary.find((variable) => variable.words.some((word) => normalized.includes(normalizeText(word))))?.key ?? null;
}

function buildPayload(question, range) {
  const inferredRange = inferQuickRange(question, range);
  const timeQuery = toTimeRangeQuery(inferredRange);
  const inferredVariable = detectVariableFromQuestion(question);

  return {
    pregunta: question,
    desde: timeQuery.valid ? toAssistantDateTime(timeQuery.start) : null,
    hasta: timeQuery.valid ? toAssistantDateTime(timeQuery.end) : null,
    variable: inferredVariable,
  };
}

function AssistantAnswer({ answer }) {
  return (
    <article className={`assistant-answer assistant-answer--${answer.prioridad || 'normal'}`}>
      <header>
        <span>Prioridad {answer.prioridad || 'normal'}</span>
        <strong>{answer.resumen}</strong>
      </header>

      {answer.hallazgos?.length ? (
        <div>
          <span>Hallazgos</span>
          <ul>
            {answer.hallazgos.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {answer.acciones?.length ? (
        <div>
          <span>Acciones sugeridas</span>
          <ul>
            {answer.acciones.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {answer.limitaciones?.length ? (
        <div>
          <span>Limites del analisis</span>
          <ul>
            {answer.limitaciones.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

export function AssistantPanel({ idInvernadero }) {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const defaultRange = useMemo(() => getDefaultTimeRange(), [isOpen]);
  const visibleSuggestions = useMemo(() => {
    const answeredCount = Math.floor(messages.length / 2);
    return suggestionSets[answeredCount % suggestionSets.length];
  }, [messages.length]);

  async function submitQuestion(nextQuestion = question) {
    const cleanQuestion = nextQuestion.trim();
    if (!cleanQuestion || status === 'loading') return;

    setStatus('loading');
    setError('');
    setQuestion('');

    try {
      const answer = await askAssistant(idInvernadero, buildPayload(cleanQuestion, defaultRange));
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: 'user', content: cleanQuestion },
        { id: crypto.randomUUID(), role: 'assistant', answer },
      ]);
      setStatus('ready');
    } catch (requestError) {
      setError(requestError.message);
      setStatus('error');
    }
  }

  return (
    <aside className={`assistant-dock ${isOpen ? 'assistant-dock--open' : ''}`} aria-label="Asistente operativo">
      <button className="assistant-toggle" onClick={() => setIsOpen((current) => !current)} type="button">
        <span>AI</span>
        <strong>Asistente</strong>
      </button>

      {isOpen ? (
        <section className="assistant-panel">
          <header className="assistant-header">
            <div>
              <span>Asistente contextual</span>
              <h2>Operacion del invernadero</h2>
            </div>
            <button className="small-button" onClick={() => setIsOpen(false)} type="button">
              Cerrar
            </button>
          </header>

          <div className="assistant-suggestions" aria-label="Preguntas sugeridas">
            {visibleSuggestions.map((item) => (
              <button key={item} onClick={() => submitQuestion(item)} type="button">
                {item}
              </button>
            ))}
          </div>

          <div className="assistant-thread">
            {messages.length ? (
              messages.map((message) =>
                message.role === 'user' ? (
                  <p className="assistant-question" key={message.id}>
                    {message.content}
                  </p>
                ) : (
                  <AssistantAnswer answer={message.answer} key={message.id} />
                ),
              )
            ) : (
              <p className="assistant-empty">
                Pregunta por alertas, tendencias, picos o acciones. El asistente responde usando lecturas reales del
                rango reciente.
              </p>
            )}

            {status === 'loading' ? <p className="assistant-loading">Analizando datos reales de la API...</p> : null}
            {error ? <p className="assistant-error">{error}</p> : null}
          </div>

          <form
            className="assistant-input"
            onSubmit={(event) => {
              event.preventDefault();
              submitQuestion();
            }}
          >
            <input
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Pregunta sobre alertas, tendencias o acciones"
              value={question}
            />
            <button className="primary-button" disabled={status === 'loading'} type="submit">
              Enviar
            </button>
          </form>
        </section>
      ) : null}
    </aside>
  );
}
