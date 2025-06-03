// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "hardhat/console.sol";

contract RoomAllocation {

    // Enum for room exchange request status 
    enum ExchangeStatus { Pending, completed }

    // Struct for storing student details
    struct Student {
        address studentID;
        bool isRegistered;
        uint256 roomID;
        uint256[] preferences;
    }

    // Struct for storing room details
    struct Room {
        uint256 RoomID;
        bool isAllocated;
        address Owner;
    }

    mapping(address => Student) internal students; // studentID => Student
    mapping(uint256 => Room) internal rooms;  // roomID => Room
    // Add auxiliary variables here if needed

    event StudentRegistered(address studentID, uint256 roomID);
    event PreferencesSet(address studentID, uint256[] preferences);
    event RoomExchanged(address fromStudent, address toStudent, uint256 newRoomID); 
    
    uint256 public totalRooms;
    uint256[] internal availableRooms;

    address[] public registeredStudents;

    modifier onlyRegistered() {
        // Your implementation here
        require(students[msg.sender].isRegistered, "You are not registered");
        _;
    }
    modifier notRegistered() {
        // Your implementation here
        require(!students[msg.sender].isRegistered, "Already registered");
        _;
    }
    modifier roomAvailable() {
        // Your implementation here
        bool found = false;
        for (uint256 i = 0; i < totalRooms; i++) {
            if (!rooms[i].isAllocated) {
                found = true;
                break;
            }
        }
        require(found, "No rooms available");
        _;
    }

    // Constructor to initialize the contract with a given number of rooms
    constructor(uint256 _totalRooms) {
        // Your implementation here
        totalRooms = _totalRooms;
        for (uint256 i = 0; i < _totalRooms; i++) {
            registerRoom(i);
        }
    }

    // Function to create a room
    function registerRoom(uint256 roomID) private {
        // Your implementation here
        rooms[roomID] = Room({
            RoomID: roomID,
            isAllocated: false,
            Owner: address(0)
        });
    }

    // Function to register a student and randomly assign an available room
    function registerStudent() public notRegistered roomAvailable{
        // Your implementation here
        for (uint256 i = 0; i < totalRooms; i++) {
            if (!rooms[i].isAllocated) {
                rooms[i].isAllocated = true;
                rooms[i].Owner = msg.sender;

                students[msg.sender] = Student({
                    studentID: msg.sender,
                    isRegistered: true,
                    roomID: i,
                    preferences: new uint256[](totalRooms) 
                });

                registeredStudents.push(msg.sender);
                emit StudentRegistered(msg.sender, i);
                return;
            }
        }
        revert("No rooms available");

    }

    // Function to set room preferences for a student
    function setPreferences(uint256[] memory _preferences) public onlyRegistered {
        // Your implementation here
        uint256 total = totalRooms;
        bool[] memory isIncluded = new bool[](total);
        uint256[] memory fullPrefs = new uint256[](total);
        uint256 index = 0;

        // Copy provided preferences, avoid duplicates
        for (uint256 i = 0; i < _preferences.length; i++) {
            uint256 roomID = _preferences[i];
            require(roomID < total, "Invalid room ID");

            if (!isIncluded[roomID]) {
                fullPrefs[index++] = roomID;
                isIncluded[roomID] = true;
            }
        }

        // Fill in missing room IDs in ascending order
        for (uint256 i = 0; i < total; i++) {
            if (!isIncluded[i]) {
                fullPrefs[index++] = i;
                isIncluded[i] = true;
            }
        }

        // Resize array to actual index
        uint256[] memory finalPrefs = new uint256[](index);
        for (uint256 i = 0; i < index; i++) {
            finalPrefs[i] = fullPrefs[i];
        }

        // Save preferences
        students[msg.sender].preferences = finalPrefs;

        // Emit event
        emit PreferencesSet(msg.sender, finalPrefs);
    }

    // Function to check the allocated room for a student
    // Returns the room ID
    function checkAllocation() public view onlyRegistered returns (uint256) {
        // Your implementation here
        return students[msg.sender].roomID;
    }

    function isPreferredOver(uint256[] memory prefs, uint256 newRoom, uint256 currentRoom) internal pure returns (bool) {
        for (uint256 i = 0; i < prefs.length; i++) {
            if (prefs[i] == newRoom) return true;
            if (prefs[i] == currentRoom) return false;
        }
        return false;
    }

    // Function to request a room exchange with another student
    function requestExchange(address _requestedStudent) public onlyRegistered {
        // Your implementation here
        require(students[_requestedStudent].isRegistered, "Student not registered");
        require(_requestedStudent != msg.sender, "Cannot request self");

        uint256 myRoom = students[msg.sender].roomID;
        uint256 theirRoom = students[_requestedStudent].roomID;

        // Check if both students prefer the other's room more than their own
        bool iBenefit = isPreferredOver(students[msg.sender].preferences, theirRoom, myRoom);
        bool theyBenefit = isPreferredOver(students[_requestedStudent].preferences, myRoom, theirRoom);

        require(iBenefit && theyBenefit, "Exchange not beneficial for both");

        // Perform room swap
        students[msg.sender].roomID = theirRoom;
        students[_requestedStudent].roomID = myRoom;

        // Update ownership in the rooms mapping
        rooms[myRoom].Owner = _requestedStudent;
        rooms[theirRoom].Owner = msg.sender;

        emit RoomExchanged(msg.sender, _requestedStudent, students[msg.sender].roomID);
    }
    // Function to check a room is allocated to which student
    function getStudentByRoom(uint256 _roomID) public view onlyRegistered returns (address) {
       // Your implementation here
        require(rooms[_roomID].RoomID == _roomID, "Room does not exist");
        return rooms[_roomID].Owner; 
    }

    // ----------------------------------- Coordination -----------------------------------

    function coordinatedExchange() public {
        uint256 n = registeredStudents.length;
        bool changed;

        do {
            changed = false;

            for (uint256 i = 0; i < n; i++) {
                address a = registeredStudents[i];

                for (uint256 j = i + 1; j < n; j++) {
                    address b = registeredStudents[j];

                    uint256 roomA = students[a].roomID;
                    uint256 roomB = students[b].roomID;

                    bool aPrefersB = isPreferredOver(students[a].preferences, roomB, roomA);
                    bool bPrefersA = isPreferredOver(students[b].preferences, roomA, roomB);

                    if (aPrefersB && bPrefersA) {
                        // Swap student room assignments
                        students[a].roomID = roomB;
                        students[b].roomID = roomA;

                        // Update room ownership
                        rooms[roomA].Owner = b;
                        rooms[roomB].Owner = a;

                        emit RoomExchanged(a, b, roomB);
                        emit RoomExchanged(b, a, roomA);

                        changed = true;
                    }
                }
            }
        } while (changed);
    }

}