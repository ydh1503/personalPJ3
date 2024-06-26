## 코드실행 준비

- yarn run pushDB
        각 schema.prisma에 따른 client 생성 및 db 연동

## 배포 URL

- http://ydh1503-sparta.store:3000

## API 명세서

- [API 명세서 링크](https://heavenly-dosa-a98.notion.site/API-13adb8baf7714017be1cf2bce5c2a273?pvs=4)

---

1.  **암호화 방식**
    - 비밀번호를 DB에 저장할 때 Hash를 이용했는데, Hash는 단방향 암호화와 양방향 암호화 중 어떤 암호화 방식에 해당할까요?
    -     Hash는 단방향 암호화에 해당한다.
    - 비밀번호를 그냥 저장하지 않고 Hash 한 값을 저장 했을 때의 좋은 점은 무엇인가요?
    -     통신 과정 또는 데이터 베이스에서 데이터에 대한 유출이 일어났을 경우 Hash된 값만 노출되어 보안을 유지할 수 있다.
2.  **인증 방식**
    - JWT(Json Web Token)을 이용해 인증 기능을 했는데, 만약 Access Token이 노출되었을 경우 발생할 수 있는 문제점은 무엇일까요?
    -     Access Token이 노출되는 경우, 노출된 Access Token을 사용하면 누구든지 인증을 통과할 수 있기 때문에 해당 토큰으로 접속한 사용자가 실제로 해당 토큰을 부여받은 사용자인 지 확인할 수 없다.
    - 해당 문제점을 보완하기 위한 방법으로는 어떤 것이 있을까요?
    -     Access Token의 인증기한 설정 및 사용자가 Token을 부여받을 때 여러 개의 Token을 한 번에 부여받아 각 Token을 모두 확인하는 경우만 인증을 진행한다. 또는 서버에서 관리하는 Refresh Token을 발급하여 해당 인증을 진행할 때 마다 Access Token을 재발급한다.
3.  **인증과 인가**
    - 인증과 인가가 무엇인지 각각 설명해 주세요.
    -     인증 : 서비스를 이용하려는 사용자의 신분을 검증하는 작업, 인가 : 이미 인증된 사용자가 특정 서비스를 이용할 권한이 있는 지 확인하는 작업
    - 위 API 구현 명세에서 인증을 필요로 하는 API와 그렇지 않은 API의 차이가 뭐라고 생각하시나요?
    -     사용자가 다른 사용자의 데이터를 간섭할 수 있는 지의 여부에 따라 구별했다.
    - 아이템 생성, 수정 API는 인증을 필요로 하지 않는다고 했지만 사실은 어느 API보다도 인증이 필요한 API입니다. 왜 그럴까요?
    -     서버 측이 아닌 사용자가 해당 API를 사용하는 경우 서버 측에서 의도하지 않은 데이터가 생성되어 제공될 수 있기 때문이다.
4.  **Http Status Code**
    - 과제를 진행하면서 사용한 Http Status Code를 모두 나열하고, 각각이 의미하는 것과 어떤 상황에 사용했는지 작성해 주세요.
    -     200 : 요청 수행 완료, 201 : 생성 요청 수행 완료, 400 : 요청 수행 실패, 401 : 잘못된 요청으로 인한 요청 수행 실패, 404 : 요청된 데이터를 찾을 수 없음, 409 : 생성 요청된 데이터에서 충돌 발생
5.  **게임 경제**
    - 현재는 간편한 구현을 위해 캐릭터 테이블에 money라는 게임 머니 컬럼만 추가하였습니다.
      - 이렇게 되었을 때 어떠한 단점이 있을 수 있을까요?
      -     money를 조회할 때마다 캐릭터 테이블에 있는 모든 정보를 로드하여 캐릭터 테이블이 커질 경우 수행이 느려질 수 있다.
      - 이렇게 하지 않고 다르게 구현할 수 있는 방법은 어떤 것이 있을까요?
      -     각 기능 로직에 따른 테이블을 따로 구현하는 경우 해당 문제를 완화할 수 있을 것 같다.
    - 아이템 구입 시에 가격을 클라이언트에서 입력하게 하면 어떠한 문제점이 있을 수 있을까요?
    -     사용자가 아이템의 가격을 임의로 설정함으로써 서버 측이 의도하지 않은 문제(인플레 등)가 발생할 수 있다.
