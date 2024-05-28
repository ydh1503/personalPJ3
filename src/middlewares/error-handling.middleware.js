export default function (err, req, res, next) {
  // 에러를 출력합니다.
  console.error(err);

  switch (err.name) {
    case 'ValidationError':
      return res.status(401).json({
        errorMessage: `'${err.details[0].context.key}' 유효성 검사에 실패했습니다. 
        (${err.details[0].context.key} : ${err.details[0].context.value})`,
      });
    default:
      // 클라이언트에게 에러 메시지를 전달합니다.
      return res.status(500).json({ errorMessage: '서버 내부 에러가 발생했습니다.' });
  }
}
