bl_info = {
    "name": "Import UML WebVis Scenario",
    "author": "Peter Kramer",
    "version": (1, 0),
    "blender": (5, 0, 1),
    "location": "File > Import > UML WebVis Scenario",
    "description": "Import a UML WebVis Scenario",
    "warning": "",
    "category": "Import-Export",
}

import io
import pathlib
import traceback

import bpy
from bpy.props import StringProperty
from bpy_extras.io_utils import ImportHelper


def get_exception_traceback_str(exc: Exception) -> str:
    # Ref: https://stackoverflow.com/a/76584117/
    file = io.StringIO()
    traceback.print_exception(exc, file=file)
    return file.getvalue().rstrip()


def get_or_create_cube_mesh(name="CubeMesh", size=1.0, force=False):
    # 1. Reuse if already exists
    mesh = bpy.data.meshes.get(name)
    if mesh:
        if force:
            bpy.data.meshes.remove(mesh)
        else:
            return mesh

    mesh = bpy.data.meshes.new(name)

    s = size / 2.0
    verts = [
        (-s, -s, -s), (-s, -s, s), (-s, s, -s), (-s, s, s),
        (s, -s, -s), (s, -s, s), (s, s, -s), (s, s, s),
    ]
    faces = [
        (0, 1, 3, 2),  # -X
        (4, 6, 7, 5),  # +X
        (0, 4, 5, 1),  # -Y
        (2, 3, 7, 6),  # +Y
        (0, 2, 6, 4),  # -Z
        (1, 5, 7, 3),  # +Z
    ]
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    return mesh


def hex_color(rgb=None, r=None, g=None, b=None):
    if rgb:
        r, g, b = rgb
    return '#%02x%02x%02x' % (r, g, b)


class Vec2:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __add__(self, other):
        return Vec2(self.x + other.x, self.y + other.y)

    def __sub__(self, other):
        return Vec2(self.x - other.x, self.y - other.y)

    def __mul__(self, other):
        if isinstance(other, int) or isinstance(other, float):
            return Vec2(self.x * other, self.y * other)
        elif isinstance(other, Vec2):
            return Vec2(self.x * other.x, self.y * other.y)
        else:
            raise NotImplementedError(
                "Not implemented: Vec2 * {}".format(str(type(other))))

    def __str__(self):
        return "({}, {})".format(self.x, self.y)

    def __len__(self):
        return 2

    def __repr__(self):
        return "Vec2({}, {})".format(self.x, self.y)

    def __eq__(self, other):
        return (self.x, self.y) == (other.x, other.y)

    def __ne__(self, other):
        return (self.x, self.y) != (other.x, other.y)

    def __hash__(self):
        return hash((self.x, self.y))

    def __getitem__(self, item):
        if isinstance(item, int):
            return (self.x, self.y)[item]
        return None

    def __setitem__(self, key, value):
        if isinstance(key, int):
            if key == 0:
                self.x = value
            elif key == 1:
                self.y = value
            else:
                raise IndexError("Vec2 has two dimensions, got: {}".format(key))
        else:
            raise KeyError(
                "Vec2 has integer dimensions, got: {}".format(type(key)))

    def __iter__(self):
        return iter([self.x, self.y])

    def magnitude(self, l_norm=1) -> float:
        if l_norm == 1:
            return abs(self.x) + abs(self.y)
        else:
            return pow(abs(self.x ** l_norm) + abs(self.y ** l_norm),
                       1.0 / l_norm)

    def dot(self, other):
        return self.x * other.x + self.y * other.y

    def ortho(self):
        return Vec2(-self.y, self.x)


class Vec3:
    def __init__(self, x, y, z):
        self.x = x
        self.y = y
        self.z = z

    def __add__(self, other):
        return Vec3(self.x + other.x, self.y + other.y, self.z + other.z)

    def __sub__(self, other):
        return Vec3(self.x - other.x, self.y - other.y, self.z - other.z)

    def __mul__(self, other):
        if isinstance(other, int) or isinstance(other, float):
            return Vec3(self.x * other, self.y * other, self.z * other)
        elif isinstance(other, Vec3):
            return Vec3(self.x * other.x, self.y * other.y, self.z * other.z)
        else:
            raise NotImplementedError(
                "Not implemented: Vec3 * {}".format(str(type(other))))

    def __str__(self):
        return "({}, {}, {})".format(self.x, self.y, self.z)

    def __len__(self):
        return 3

    def __repr__(self):
        return "Vec3({}, {}, {})".format(self.x, self.y, self.z)

    def __iter__(self):
        return iter([self.x, self.y, self.z])

    def __eq__(self, other):
        return (self.x, self.y, self.z) == (other.x, other.y, other.z)

    def __ne__(self, other):
        return (self.x, self.y, self.z) != (other.x, other.y, other.z)

    def __hash__(self):
        return hash((self.x, self.y, self.z))

    def __getitem__(self, item):
        if isinstance(item, int):
            return (self.x, self.y, self.z)[item]
        return None

    def __setitem__(self, key, value):
        if isinstance(key, int):
            if key == 0:
                self.x = value
            elif key == 1:
                self.y = value
            elif key == 2:
                self.z = value
            else:
                raise IndexError(
                    "Vec3 has three dimensions, got: {}".format(key))
        else:
            raise KeyError(
                "Vec3 has integer dimensions, got: {}".format(type(key)))

    def project(self, orthogonal_axis=0):
        v = Vec3(self.x, self.y, self.z)
        v[orthogonal_axis] = 0
        return v

    def project2d(self, orthogonal_axis=0) -> Vec2:
        assert isinstance(orthogonal_axis, int) and 0 <= orthogonal_axis < 3
        v = Vec2(0, 0)
        i = 0
        for dimension in range(len(self)):
            if dimension != orthogonal_axis:
                v[i] = self[dimension]
                i += 1
        return v

    def magnitude(self, l_norm=1) -> float:
        if l_norm == 1:
            return abs(self.x) + abs(self.y) + abs(self.z)
        else:
            return pow(abs(self.x ** l_norm) + abs(self.y ** l_norm) + abs(
                self.z ** l_norm), 1.0 / l_norm)

    def normalize(self, l_norm=1):
        magnitude = self.magnitude(l_norm)
        self.x /= magnitude
        self.y /= magnitude
        self.z /= magnitude
        return self

    def dot(self, other) -> float:
        return self.x * other.x + self.y * other.y + self.z * other.z

    def cross(self, other):
        return Vec3(self.y * other.z - self.z * other.y,
                    self.z * other.x - self.x * other.z,
                    self.x * other.y - self.y * other.x)


class UMLScenario:
    class RobotType:
        def __init__(self, identifier: int, color: Vec3, size: float):
            self.identifier = identifier
            self.color = color
            self.size = size

    class Robot:
        def __init__(self, identifier: int, robot_type: int,
                     pos0: Vec3):
            self.identifier = identifier
            self.type_identifier = robot_type
            self.pos0 = pos0

    class RobotMove:
        def __init__(self, robot: int, move_type: int, delta: Vec3):
            self.robot_identifier = robot
            self.move_type = abs(move_type)
            self.delta = delta

        def anchor_direction(self):
            if self.move_type == 1:
                return Vec3(1, 0, 0)
            elif self.move_type == 2:
                return Vec3(0, 1, 0)
            elif self.move_type == 3:
                return Vec3(0, 0, 1)
            elif self.move_type == 4:
                return Vec3(-1, 0, 0)
            elif self.move_type == 5:
                return Vec3(0, -1, 0)
            elif self.move_type == 6:
                return Vec3(0, 0, -1)
            # Default: None
            return Vec3(0, 0, 0)

        def is_convex_transition(self):
            return self.delta.magnitude() > 1

        def transition_steps(self, out=print):
            if not self.is_convex_transition():
                assert self.delta.magnitude() == 1, "type: {}, delta: {}".format(
                    self.move_type, self.delta)
                return self.delta
            else:
                assert self.delta.magnitude() == 2, "type: {}, delta: {}".format(
                    self.move_type, self.delta)
                delta1 = self.delta * self.anchor_direction()
                return delta1, self.delta - delta1

    class Step:
        def __init__(self, moves: list = None, break_before: bool = False):
            if moves is None:
                moves = []
            self.moves: list[UMLScenario.RobotMove] = moves
            self.break_before: bool = break_before

    def __init__(self, robot_types: dict[int, RobotType] = None,
                 robots: dict[int, Robot] = None, steps=None):
        if steps is None:
            steps = list()
        if robots is None:
            robots = dict()
        if robot_types is None:
            robot_types = dict()
        self.robot_types = robot_types
        self.robots: dict[int, UMLScenario.Robot] = robots
        self.steps: list[UMLScenario.Step] = steps

    def __str__(self):
        return f"UMLScenario(#types: {len(self.robot_types)}, #robots: {len(self.robots)}, #steps: {len(self.steps)})"

    @staticmethod
    def from_file(f):
        scenario = UMLScenario()
        in_block = -1
        #  -1 = Header
        #   0 = Robot Types
        #   1 = Robots
        # >=2 = Frames
        for line in f:
            line = line.strip()
            if "//" in line:
                line = line[:line.find("//")].strip()
            if len(line) == 0:
                in_block += 1
                if in_block >= 2:
                    scenario.steps.append(UMLScenario.Step())
            else:
                if line[0] not in "0123456789*":
                    continue  # Hack
                while line.startswith("*"):
                    line = line[1:]
                    scenario.steps[-1].break_before = True

                values = [int(entry.strip()) for entry in
                          filter(lambda v: len(v) > 0, line.split(","))]
                if in_block == 0:  # style
                    [identifier, r, g, b, size] = values
                    scenario.robot_types[
                        identifier] = UMLScenario.RobotType(identifier,
                                                            Vec3(r, g,
                                                                 b),
                                                            size / 100.0)
                elif in_block == 1:
                    [identifier, robot_type, x, y, z] = values
                    scenario.robots[identifier] = UMLScenario.Robot(
                        identifier, robot_type, Vec3(x, y, z))
                elif in_block >= 2:
                    [robot, move_type, x, y, z] = values
                    scenario.steps[-1].moves.append(
                        UMLScenario.RobotMove(robot, move_type, Vec3(x, y, z)))
        return scenario


class ScenarioImportHelper(bpy.types.Operator, ImportHelper):
    """Import UML scenario (*.scen)"""
    bl_idname = "import_scene.modular_robots"
    bl_label = "Import Modular Robots"
    bl_options = {'REGISTER', 'UNDO'}

    # ImportHelper mixin gives you a file selector
    filename_ext = ".scen"
    filter_glob: bpy.props.StringProperty(
        default="*.scen",
        options={'HIDDEN'},
        maxlen=255
    )
    steps: bpy.props.IntProperty(
        name="Frames per Step",
        default=30,
        min=1,
    )
    freeze_steps: bpy.props.IntProperty(
        name="Freeze Frames",
        default=5,
        min=0,
    )

    def draw(self, context):
        layout = self.layout
        row = layout.row(align=True)
        row.prop(self, "steps")

    def execute(self, context):
        try:
            return self.load_scenario_data(self.filepath,
                                           keyframe_step=int(self.steps),
                                           freeze_step=int(self.freeze_steps))
        except Exception as e:
            self.report({'ERROR'},
                        f"Failed to read JSON: {get_exception_traceback_str(e)}")
            return {'CANCELLED'}

    def menu_import(self, context):
        self.layout.operator(
            ScenarioImportHelper.bl_idname,
            text="Modular Robots (.scen)"
        )

    def load_scenario_data(self, path, keyframe_step=10, freeze_step=5):
        scenario: UMLScenario | None = None
        friendly_name = pathlib.Path(path).stem

        uml_collection = bpy.data.collections.new(friendly_name)
        bpy.context.scene.collection.children.link(uml_collection)

        with (open(path, 'r', encoding='utf-8') as f):
            scenario = UMLScenario.from_file(f)

        if scenario is None:
            self.report({'ERROR'}, f"Failed to read Scenario file: {path}")
            return {'CANCELLED'}

        self.report({'INFO'}, str(scenario))

        for robot_type in scenario.robot_types.values():
            mesh = get_or_create_cube_mesh(
                "RobotType[%02i]" % robot_type.identifier, robot_type.size,
                True)

        objects = dict()
        keyframe = 1
        for robot in scenario.robots.values():
            mesh = get_or_create_cube_mesh(
                "RobotType[%02i]" % robot.type_identifier)
            objects[robot.identifier] = bpy.data.objects.new(
                "Robot.%03i" % robot.identifier, mesh)
            objects[robot.identifier].location = tuple(robot.pos0)
            uml_collection.objects.link(objects[robot.identifier])
            objects[robot.identifier].keyframe_insert("location",
                                                      frame=keyframe)
        for step in scenario.steps:
            # if step.break_before:
            #     keyframe += keyframe_step
            #     for robot_identifier in scenario.robots.keys():
            #         objects[robot_identifier].keyframe_insert("location",
            #                                                   frame=keyframe)

            for move in step.moves:
                obj = objects[move.robot_identifier]
                step = move.transition_steps()
                if isinstance(step, Vec3):
                    obj.location = tuple(Vec3(*obj.location) + step)
                else:
                    obj.location = tuple(Vec3(*obj.location) + step[0])
                    objects[move.robot_identifier].keyframe_insert("location",
                                                                   frame=keyframe + keyframe_step // 2)
                    obj.location = tuple(Vec3(*obj.location) + step[1])

            keyframe += keyframe_step
            for robot_identifier in scenario.robots.keys():
                objects[robot_identifier].keyframe_insert("location",
                                                          frame=keyframe)
                if freeze_step > 0:
                    objects[robot_identifier].keyframe_insert("location",
                                                              frame=keyframe + freeze_step)
            keyframe += freeze_step
        bpy.context.scene.simulation_frame_end = keyframe

        return {'FINISHED'}


def register():
    bpy.utils.register_class(ScenarioImportHelper)
    bpy.types.TOPBAR_MT_file_import.append(ScenarioImportHelper.menu_import)


def unregister():
    bpy.utils.unregister_class(ScenarioImportHelper)
    bpy.types.TOPBAR_MT_file_import.remove(ScenarioImportHelper.menu_import)


if __name__ == "__main__":
    register()
