#include "Cube.hpp"

float _cubeVertices[] = { 
    //    Coords            Tex Coord
    // Back face:
    -0.5f, -0.5f, -0.5f,    0.0f, 0.0f, // Bottom left    0
     0.5f, -0.5f, -0.5f,    1.0f, 0.0f, // Bottom right   1
     0.5f,  0.5f, -0.5f,    1.0f, 1.0f, // Top right      2
    -0.5f,  0.5f, -0.5f,    0.0f, 1.0f, // Top left       3
    // Front face:
    -0.5f, -0.5f,  0.5f,    0.0f, 0.0f, // Bottom left    4
     0.5f, -0.5f,  0.5f,    1.0f, 0.0f, // Bottom right   5
     0.5f,  0.5f,  0.5f,    1.0f, 1.0f, // Top right      6
    -0.5f,  0.5f,  0.5f,    0.0f, 1.0f, // Top left       7
    // Left face:
    -0.5f,  0.5f,  0.5f,    1.0f, 0.0f, // Bottom left    8
    -0.5f,  0.5f, -0.5f,    1.0f, 1.0f, // Bottom right   9
    -0.5f, -0.5f, -0.5f,    0.0f, 1.0f, // Top right      10
    -0.5f, -0.5f,  0.5f,    0.0f, 0.0f, // Top left       11
    // Right face:
     0.5f,  0.5f,  0.5f,    1.0f, 0.0f, // Bottom left    12
     0.5f,  0.5f, -0.5f,    1.0f, 1.0f, // Bottom right   13
     0.5f, -0.5f, -0.5f,    0.0f, 1.0f, // Top right      14
     0.5f, -0.5f,  0.5f,    0.0f, 0.0f, // Top left       15
    // Bottom face:         
    -0.5f, -0.5f, -0.5f,    0.0f, 1.0f, // Bottom left    16
     0.5f, -0.5f, -0.5f,    1.0f, 1.0f, // Bottom right   17
     0.5f, -0.5f,  0.5f,    1.0f, 0.0f, // Top right      18
    -0.5f, -0.5f,  0.5f,    0.0f, 0.0f, // Top left       19
    // Top face:            
    -0.5f,  0.5f, -0.5f,    0.0f, 1.0f, // Bottom left    20
     0.5f,  0.5f, -0.5f,    1.0f, 1.0f, // Bottom right   21
     0.5f,  0.5f,  0.5f,    1.0f, 0.0f, // Top right      22
    -0.5f,  0.5f,  0.5f,    0.0f, 0.0f, // Top left       23
};

unsigned int _cubeIndices[] = {  // For the Element Buffer Object
    0, 1, 2,    0, 2, 3,    // Back face
    4, 5, 6,    4, 6, 7,    // Front face
    8, 9, 10,   8, 10, 11,  // Left face
    12, 13, 14, 12, 14, 15, // Right face
    16, 17, 18, 16, 18, 19, // Bottom face
    20, 21, 22, 20, 22, 23  // Top face
};

unsigned int _createCubeVAO() {
    unsigned int VAO, VBO, EBO;
    glGenVertexArrays(1, &VAO);
    glGenBuffers(1, &VBO);
    glGenBuffers(1, &EBO);
    glBindVertexArray(VAO);
    glBindBuffer(GL_ARRAY_BUFFER, VBO);
    glBufferData(GL_ARRAY_BUFFER, sizeof(_cubeVertices), _cubeVertices, GL_STATIC_DRAW);
    glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, EBO);     // Bind the EBO to the active GL_ELEMENT_ARRAY_BUFFER
    glBufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof(_cubeIndices), _cubeIndices, GL_STATIC_DRAW); // Cp index data into EBO
    glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 5 * sizeof(float), (void*)0); // Configure vertex attribs
    glVertexAttribPointer(1, 2, GL_FLOAT, GL_FALSE, 5 * sizeof(float), (void*)(3*sizeof(float)));
    glEnableVertexAttribArray(0);
    glEnableVertexAttribArray(1);
    return VAO;
}

Cube::Cube(float x, float y, float z) {
    this->setPos(x, y, z);
}

void Cube::setPos(float x, float y, float z) {
    this->x = x;
    this->y = y;
    this->z = z;
}

void Cube::draw() {
    glm::mat4 modelmat = glm::translate(glm::mat4(1.0f), glm::vec3(this->x, this->y, this->z));
    glUniformMatrix4fv(modelLoc, 1, GL_FALSE, glm::value_ptr(modelmat));
    glDrawElements(GL_TRIANGLES, 36, GL_UNSIGNED_INT, 0);
}