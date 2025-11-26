import requests
import time
import hashlib
import uuid
import jwt
import argparse
import sys
from urllib.parse import urlencode

# Bithumb API Base URL
BASE_URL = "https://api.bithumb.com"

# 여러 계정의 API 키 목록
api_keys = [
    {"name": "Lucian", "api_key": "8b41a5f618d0976c44c0e2ba149206fec27d1c5d92b124", "secret_key": "YWJkYjEzMzY4YWJmOTkzOWFkZjAxYmQwOTE2ODMzYjBlNGJiMTA5OTBiZmJjMTdiMTg1Zjk3YjMyNmQ3Nw=="},
    # 필요한 만큼 추가
]


def generate_jwt_token(api_key, secret_key, params=None):
    """
    Bithumb API JWT 토큰 생성 (공식 가이드 예제 기반)
    공식 문서: https://apidocs.bithumb.com/docs/인증-헤더-만들기
    """
    # 파라미터가 있는 경우 query_hash 생성
    if params:
        # urlencode 후 .encode()로 바이트 변환 (공식 예제와 동일)
        query = urlencode(params).encode()

        hash_obj = hashlib.sha512()
        hash_obj.update(query)
        query_hash = hash_obj.hexdigest()

        payload = {
            'access_key': api_key,
            'nonce': str(uuid.uuid4()),
            'timestamp': round(time.time() * 1000),
            'query_hash': query_hash,
            'query_hash_alg': 'SHA512',
        }
    else:
        # 파라미터가 없는 경우
        payload = {
            'access_key': api_key,
            'nonce': str(uuid.uuid4()),
            'timestamp': round(time.time() * 1000),
        }

    # JWT 토큰 생성 (secret_key를 그대로 사용 - 공식 예제와 동일)
    jwt_token = jwt.encode(payload, secret_key)
    authorization_token = 'Bearer {}'.format(jwt_token)

    return authorization_token, payload


def api_request(endpoint, params, api_key, secret_key, method="POST", debug=False):
    """
    Bithumb API 요청 (JWT 기반 - 공식 가이드 방식)
    공식 문서: https://apidocs.bithumb.com/
    """
    url = f"{BASE_URL}{endpoint}"

    # JWT 토큰 생성
    authorization_token, payload = generate_jwt_token(api_key, secret_key, params)

    # 디버깅 모드일 때 정보 출력
    if debug:
        print(f"[DEBUG] Endpoint: {endpoint}")
        print(f"[DEBUG] Params: {params}")
        print(f"[DEBUG] JWT Payload: {payload}")
        print(f"[DEBUG] Authorization Token: {authorization_token[:80]}...")

    # 헤더 설정 (JWT 방식)
    headers = {
        "Authorization": authorization_token,
        "Content-Type": "application/json; charset=utf-8"
    }

    # 요청 전송
    try:
        if method == "POST":
            response = requests.post(url, json=params, headers=headers)
        else:
            response = requests.get(url, params=params, headers=headers)

        # 디버깅을 위한 응답 확인
        if debug:
            print(f"[DEBUG] HTTP Status Code: {response.status_code}")
            print(f"[DEBUG] Response: {response.text[:500]}")

        if response.status_code != 200:
            print(f"HTTP Status Code: {response.status_code}")
            print(f"Response: {response.text}")

        return response.json()
    except Exception as e:
        print(f"API 요청 오류: {e}")
        return {"status": "error", "message": str(e)}


def get_balance(api_key, secret_key, coin=None, debug=False):
    """잔액 조회 (전체 계좌)"""
    endpoint = "/v1/accounts"
    # GET 방식이므로 params는 None (파라미터 없음)
    params = None
    return api_request(endpoint, params, api_key, secret_key, method="GET", debug=debug)


def get_current_price(coin, payment_currency="KRW"):
    """현재가 조회 (Public API)"""
    endpoint = f"/public/ticker/{coin}_{payment_currency}"
    url = f"{BASE_URL}{endpoint}"
    response = requests.get(url)
    data = response.json()

    if data.get("status") == "0000":
        return float(data["data"]["closing_price"])
    else:
        raise Exception(f"현재가 조회 실패: {data.get('message', 'Unknown error')}")


def place_order(api_key, secret_key, order_currency, payment_currency, units, order_type="bid", debug=False):
    """
    주문 실행 (시장가)
    order_type: "bid" (매수) 또는 "ask" (매도)
    units: 주문 수량
    """
    endpoint = "/v1/orders"
    # market 형식: "KRW-BTC" (payment_currency-order_currency)
    market = f"{payment_currency}-{order_currency}"

    # 시장가 매수는 "price" (총 금액), 시장가 매도는 "market" (수량)
    if order_type == "bid":
        # 시장가 매수: 총 구매 금액 (KRW)
        ord_type = "price"
        # units가 코인 수량이면 금액으로 변환 필요 (현재가 필요)
        # 여기서는 units를 이미 금액(KRW)으로 받는다고 가정
        price = str(units)
        volume = None
    else:
        # 시장가 매도: 코인 수량
        ord_type = "market"
        volume = str(units)
        price = None

    params = {
        "market": market,
        "side": order_type,
        "ord_type": ord_type
    }

    if volume:
        params["volume"] = volume
    if price:
        params["price"] = price

    return api_request(endpoint, params, api_key, secret_key, method="POST", debug=debug)


def trade_with_options(api_key, secret_key, coin, mode, amount, min_krw=5000, debug=False):
    """
    옵션에 따른 거래 실행
    mode: 'buy', 'sell', 'both'
    amount: 거래 금액 (KRW)
    """
    print(f"\n--- 계정({api_key[:10]}...) 거래 시작 [Mode: {mode}, Amount: {amount}] ---")

    # 현재 잔액 조회
    balance_response = get_balance(api_key, secret_key, coin, debug=debug)

    if not isinstance(balance_response, list):
        print(f"계정({api_key}) - 잔액 조회 실패: 잘못된 응답 형식")
        return

    available_coin = 0
    available_krw = 0

    for account in balance_response:
        if account.get("currency") == "KRW":
            available_krw = float(account.get("balance", 0))
        elif account.get("currency") == coin:
            available_coin = float(account.get("balance", 0))

    print(f"현재 {coin} 보유량: {available_coin}, 현재 KRW 잔액: {available_krw}")

    # 매수 로직
    if mode in ['buy', 'both']:
        buy_amount = amount

        # 잔액 부족 시 로직
        if available_krw < buy_amount:
            print(f"보유 KRW({available_krw})가 요청 금액({buy_amount})보다 적습니다.")
            if available_krw >= min_krw:
                print(f"최소 주문 가능 금액({min_krw}) 이상이므로 최소 금액으로 매수를 진행합니다.")
                buy_amount = min_krw
            else:
                print(f"보유 KRW가 최소 주문 금액({min_krw}) 미만이므로 매수를 건너뜁니다.")
                buy_amount = 0

        if buy_amount > 0:
            print(f"매수 진행: {buy_amount} KRW (시장가)")
            buy_order = place_order(api_key, secret_key, coin, "KRW", buy_amount, "bid", debug=debug)
            print(f"매수 주문 결과: {buy_order}")
            
            if "error" in buy_order or not buy_order.get("uuid"):
                 print("매수 실패로 인해 중단합니다.")
                 return

            # 매수 후 대기
            time.sleep(2)

    # 매도 로직
    if mode in ['sell', 'both']:
        # 매수 후 잔액 재조회 (both 모드일 경우 매수된 수량 반영을 위해)
        if mode == 'both':
            balance_response = get_balance(api_key, secret_key, coin)
            if isinstance(balance_response, list):
                for account in balance_response:
                    if account.get("currency") == coin:
                        available_coin = float(account.get("balance", 0))
                        break
            print(f"매수 후 {coin} 보유량: {available_coin}")

        # 매도 수량 계산 (시장가 매도는 수량 기준)
        try:
            current_price = get_current_price(coin)
        except Exception as e:
            print(f"현재가 조회 실패: {e}")
            return

        # 매도 목표 금액(KRW)을 코인 수량으로 환산
        target_sell_coin_amount = amount / current_price
        
        sell_units = target_sell_coin_amount

        # 보유량이 부족한 경우
        if available_coin < sell_units:
             print(f"보유 코인({available_coin})이 요청 매도량({sell_units:.8f})보다 적습니다.")
             # 최소 주문 금액(KRW)에 해당하는 코인 양
             min_sell_units = min_krw / current_price
             
             if available_coin * current_price >= min_krw:
                 print(f"보유분이 최소 주문 금액({min_krw} KRW) 이상이므로, 보유 전량을 매도합니다.")
                 sell_units = available_coin
             else:
                 print(f"보유 코인 가치가 최소 주문 금액({min_krw} KRW) 미만이므로 매도를 건너뜁니다.")
                 sell_units = 0
        
        if sell_units > 0:
            print(f"매도 진행: {sell_units:.8f} {coin} (약 {sell_units * current_price:.0f} KRW)")
            sell_order = place_order(api_key, secret_key, coin, "KRW", sell_units, "ask", debug=debug)
            print(f"매도 주문 결과: {sell_order}")
            
            time.sleep(2)
            
            # 최종 잔액 확인
            balance_response = get_balance(api_key, secret_key, coin)
            if isinstance(balance_response, list):
                final_krw = 0
                for account in balance_response:
                    if account.get("currency") == "KRW":
                        final_krw = float(account.get("balance", 0))
                        break
                print(f"최종 KRW 잔액: {final_krw}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Bithumb API Trading Script")
    parser.add_argument("--mode", choices=['buy', 'sell', 'both'], required=True, help="Trading mode: buy, sell, or both")
    parser.add_argument("--amount", type=int, required=True, help="Trading amount in KRW")
    parser.add_argument("--coin", type=str, default="BTC", help="Coin ticker (default: BTC)")
    parser.add_argument("--debug", action="store_true", help="Enable debug output")

    args = parser.parse_args()

    for api_key_info in api_keys:
        trade_with_options(
            api_key=api_key_info["api_key"],
            secret_key=api_key_info["secret_key"],
            coin=args.coin,
            mode=args.mode,
            amount=args.amount,
            min_krw=5000, # 빗썸 최소 주문 금액
            debug=args.debug
        )
