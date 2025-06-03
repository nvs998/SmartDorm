Your name: Naveen Soni
Your student ID: 201845795

[If applicable] Your teammate's name: Rahul Krishna
[If applicable] Your teammate's student ID: 201858988

## Description of the proposed coordination mechanism implemented in the coordinatedExchange() function (no more than 200 words):
<!-- Example: Firstly, the function iterates through the students to get ...  -->
The coordinatedExchange() function is designed to improve room allocation by allowing students to swap rooms if it benefits both parties. Each student provides a ranked list of preferred rooms. The function loops through all pairs of registered students and checks if both would prefer to exchange their current rooms based on these preferences using isPreferredOver() function.

If a mutually beneficial swap is found, the room assignments are updated, and the change is recorded. To capture further possible improvements triggered by earlier swaps, the function repeats this process for multiple rounds, until no further swaps are possible. This ensures the coordination process doesn’t run indefinitely while still giving students multiple chances to improve their allocations.

## Do you use any additional contract variables? If so, what is the purpose of each variable? (no more than 200 words):
<!-- Example: I use the a uint256 variable called ... to keep track of ...  -->
Yes, We added one additional variable: address[] public registeredStudents.

This array keeps track of all students who have successfully registered. Since Solidity mappings like students are not iterable, this array is necessary for looping through registered students in the coordinatedExchange() function. It allows the contract to compare room preferences between students and determine whether mutually beneficial swaps can be made. Without this array, it would be impossible to coordinate exchanges efficiently, as we wouldn't have access to a list of participant addresses.

This variable ensures that coordination logic can run entirely on-chain without requiring external indexing or data storage, making the contract fully self-contained and decentralized.

## Do you use any additional data structures (structs)? If so, what is the purpose of each structure? (no more than 200 words):
<!-- Example: I use the a struct called ... that stores ...  -->
No, We did not introduce any additional structs. The contract uses two predefined structures namely Student and Room.

These built-in structures are sufficient to handle registration, room assignment, preference management, and coordination logic. All operations, including the coordinated room exchange, rely on these existing structs without the need for custom or additional structures.

## Do you use any additional contract functions? If so, what is the purpose of each function? (no more than 200 words):
<!-- Example: I use the a function called ... to ...  -->
Yes, We added one additional helper function: isPreferredOver.

This internal pure function compares two room IDs based on a student's preference list. It returns true if the student prefers the new room over their currently assigned room. It is used in the coordinatedExchange() and exchangeRequest() functions to determine whether a room swap is beneficial for both students.

The function improves code readability, avoids repetition, and isolates preference comparison logic in a reusable and testable manner. Aside from this helper, no other additional contract functions were introduced. The main coordination logic and room allocation processes are implemented using the functions provided in the original contract template.

## Did you implement any additional test cases to test your smart contract? If so, what are these tests?
<!-- Example: My contract passed an additional test case of ...  -->
Yes, We added a few test cases to handle edge situations and make sure the contract behaves correctly even under unusual conditions. These include:

Over-registration: Checks what happens when more students try to register than the number of available rooms. The test ensures extra students are blocked gracefully with a clear error message.

Missing or incomplete preferences: Validates that the contract can handle students who submit only partial preference lists (or none at all), and still assigns them rooms by filling in the rest automatically.

Self-exchange protection: Makes sure a student can’t request a room exchange with themselves, which would be pointless and waste gas.

Unnecessary coordination: Tests scenarios where no beneficial swaps are possible, and ensures the coordinatedExchange() function exits without making unnecessary changes.



