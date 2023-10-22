import socket
import time

class Client:
  def __init__(self, player_name, strategy, host = "localhost", port = 4000):
    print("Connecting...")
    while True:
      try:
        client_socket = socket.socket()
        client_socket.connect((host, port))
        break
      except socket.error as e:
        if e.errno == 61:
          time.sleep(0.5)
        else:
          raise e
    print("Connection established")
    
    message = player_name
    solution = None
    game_info = None

    total_rounds = 0
    current_round = 0 # Round counter, starts from 0
    current_set = 1 # Set counter, 1 or 2
    while True:
      try:
        client_socket.send(str(message).encode())
        data = client_socket.recv(16000).decode()
      except:
        print("Server closed")
        break

      if not data:
        break

      if game_info == None:
        # Received initial data
        game_info = data.split(" ")

        # Information directly provided by server
        initial_side = game_info[0] 
        balance = (int(game_info[1]), int(game_info[2]))
        prob_seq = list(map(float, game_info[3:]))

        total_rounds = len(prob_seq)
        solution = strategy(initial_side, balance, prob_seq)
        message = solution.solve()

        current_round += 1
      else:
        # Received the balance of last round
        round_info = data.split(" ")
        balance = (int(round_info[0]), int(round_info[1]))

        if current_round == total_rounds:
          if current_set == 1:
            # First set completed, switch sides
            current_round = 0
            solution.switchSides()
            current_set = 2
          elif current_set == 2:
            solution.endOfGame(balance)
            break
        else:
          solution.update(current_round, balance)
        
        message = solution.solve()

        # Update round counter
        current_round += 1
    
    client_socket.close()