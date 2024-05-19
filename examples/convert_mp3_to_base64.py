import base64

def get_mp3_binary(path_to_mp3):
    with open(path_to_mp3, mode='rb') as f:
        binary_data = f.read()
    return binary_data

def write_binary(binary_data, fileName):
    base64_text = base64.b64encode(binary_data).decode()
    with open(fileName, "w") as f:
        f.write(base64_text)

write_binary(get_mp3_binary("audio.mp3"), "audio.txt")

