import { useMemo, useState } from 'react';
import { askAssistant } from '../../services/invernaderosApi.js';
import { getDefaultTimeRange, toTimeRangeQuery } from '../../utils/timeRange.js';

const suggestions = [
  'Que paso hoy?',
  'Que variables estan fuera de rango?',
  'Que acciones recomiendas?',
  'Que tendencia tuvo la temperatura?',
];

function buildPayload(question, range, variable) {
  const timeQuery = toTimeRangeQuery(range);

  return {
    pregunta: question,
    desde: timeQuery.valid ? timeQuery.desde : null,
    hasta: timeQuery.valid ? timeQuery.hasta : null,
    variable: variable || null,
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
            {suggestions.map((item) => (
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
