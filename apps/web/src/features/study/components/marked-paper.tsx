import { paperMark, tallyText, type PaperQuestion } from '@atlas/desk';

export function MarkedPaper({
  questions,
  tally,
  filter,
  onFilter,
  onJump,
}: {
  questions: PaperQuestion[];
  tally: { right: number; wrong: number; skip: number; open: number };
  filter: 'all' | 'wrong' | 'skip';
  onFilter: (filter: 'all' | 'wrong' | 'skip') => void;
  onJump: (id: string) => void;
}) {
  const shown = questions.filter((item) => {
    if (filter === 'wrong') return item.blanks.some((blank) => blank.verdict === 'wrong');
    if (filter === 'skip') return item.blanks.some((blank) => blank.verdict === 'skip');
    return true;
  });
  return (
    <section className="marked-paper">
      <h3>交卷对照</h3>
      <p className="marked-tally">{tallyText(tally)}。错的写你选和正解，对的只打一个勾。</p>
      <div className="marked-filters">
        {(['all', 'wrong', 'skip'] as const).map((id) => (
          <button type="button" key={id} className={`filterchip ${filter === id ? 'active' : ''}`} onClick={() => onFilter(id)}>
            {{ all: '全部', wrong: '只看错题', skip: '未答' }[id]}
          </button>
        ))}
      </div>
      <ol className="marked-list">
        {shown.length === 0 ? <li className="quiet-mark">这个筛选下没有题目</li> : null}
        {shown.map((item) => {
          const mark = paperMark(item.blanks);
          return (
            <li className="marked-row" key={item.questionId} id={`mark-${item.questionId}`}>
              <a href={`#${item.questionId}`} onClick={(event) => { event.preventDefault(); onJump(item.questionId); }}>{item.questionId} {item.title}</a>
              {mark === 'wrong' ? <span className="pen-mark">错</span> : mark === 'right' ? <span className="quiet-mark">对</span> : mark === 'skip' ? <span className="quiet-mark">未答</span> : <span className="quiet-mark">概念填空</span>}
              {item.blanks.map((blank) => {
                if (blank.verdict === 'open') return <p className="marked-open" key={blank.index}>{blank.label}　{blank.answer}</p>;
                if (blank.verdict !== 'wrong' && blank.verdict !== 'skip') return null;
                return (
                  <div key={blank.index} style={{ display: 'contents' }}>
                    {item.blanks.length > 1 ? <span className="marked-label">{blank.label}</span> : null}
                    <div className="pair">
                      <div className="yours"><span>你选</span><b>{blank.yours}</b></div>
                      <div><span>正解</span><b>{blank.answer}</b></div>
                    </div>
                    {blank.notes.length > 0 ? (
                      <details className="marked-note">
                        <summary>这一项为什么不选</summary>
                        {blank.notes.map((note) => (
                          <p key={note.letter}>{note.letter} {note.name}。{[note.meaning ? `是什么：${note.meaning}` : '', note.reason ? `为什么错：${note.reason}` : ''].filter(Boolean).join('')}</p>
                        ))}
                      </details>
                    ) : null}
                  </div>
                );
              })}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
