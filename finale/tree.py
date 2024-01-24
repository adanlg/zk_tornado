import math

# Total number of slots needed
slots_needed = 50_000_000

# Calculate the height of the Merkle tree
tree_height = math.ceil(math.log2(slots_needed))

print("Minimum height of the Merkle tree:", tree_height)
//https://github.com/ubuntuvmgithub/zk_tornado.git