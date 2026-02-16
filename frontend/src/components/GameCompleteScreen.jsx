/**
 * Общий экран результата игры.
 * Используется в MemoGame, TruthOrMyth, ReactionGame.
 */
export default function GameCompleteScreen({
  title,
  subtitle,
  stats,
  buttonText = 'Далее',
  onNext,
  titleTag = 'h2',
  buttonClassName = '',
  buttonWrapperClassName = 'truth-actions',
}) {
  const TitleTag = titleTag
  const buttonEl = (
    <button type="button" className={buttonClassName} onClick={onNext}>
      {buttonText}
    </button>
  )

  return (
    <>
      <TitleTag>{title}</TitleTag>
      <p className="subtitle">{subtitle}</p>
      {stats}
      {buttonWrapperClassName ? (
        <div className={buttonWrapperClassName}>{buttonEl}</div>
      ) : (
        buttonEl
      )}
    </>
  )
}
